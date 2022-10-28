// React + Web3 Essentials
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import React from 'react';
import ReactGA from 'react-ga';

// External Packages
import { useDispatch, useSelector } from 'react-redux';
import { toast as toaster } from 'react-toastify';
import styled, { ThemeProvider, useTheme } from 'styled-components';

// Internal Compoonents
import { postReq } from 'api';
import InboxComponent from 'components/InboxComponent';
import LoaderSpinner, { LOADER_TYPE } from 'components/reusables/loaders/LoaderSpinner';
import NotificationToast from 'primaries/NotificationToast';
import { Section } from 'primaries/SharedStyling';
import { setCommunicatorReadProvider, setCoreReadProvider, setPushAdmin } from 'redux/slices/contractSlice';
import Feedbox from 'segments/Feedbox';
import ChannelsDataStore from 'singletons/ChannelsDataStore';
import UsersDataStore from 'singletons/UsersDataStore';

// Internal Configs
import { abis, addresses, appConfig } from 'config';
import GLOBALS, { device, globalsMargin } from 'config/Globals';

export const ALLOWED_CORE_NETWORK = appConfig.coreContractChain;

// Create Inbox Module
const InboxModule = () => {
  // React GA Analytics
  ReactGA.pageview('/inbox');

  const dispatch = useDispatch();
  const { account, chainId, library } = useWeb3React();
  const { epnsReadProvider, epnsCommReadProvider } = useSelector((state) => state.contracts);

  // toast related section
  const [toast, showToast] = React.useState(null);
  const clearToast = () => showToast(null);

  // whether secret notif are enabled
  const [enabledSecretNotif, setEnabledSecretNotif] = React.useState(false);

  const themes = useTheme();
  const onCoreNetwork = ALLOWED_CORE_NETWORK === chainId;

  //clear toast variable after it is shown
  React.useEffect(() => {
    if (toast) {
      clearToast();
    }
  }, [toast]);
  // toast related section

  // React.useEffect(() => {
  //   const fetchEncryptionKey = async () => {
  //     // get public key from Backend API
  //     let encryptionKey = await postReq('/encryption_key/get_encryption_key', {
  //       address: account,
  //       op: 'read',
  //     }).then((res) => {
  //       return res.data?.encryption_key;
  //     });

  //     if (encryptionKey != null) {
  //       setEnabledSecretNotif(true);
  //     }
  //   };
  //   fetchEncryptionKey();
  // }, [enabledSecretNotif]);

  React.useEffect(() => {
    (async function init() {
      const coreProvider = onCoreNetwork ? library : new ethers.providers.JsonRpcProvider(appConfig.coreRPC);

      // inititalise the read contract for the core network
      const coreContractInstance = new ethers.Contract(addresses.epnscore, abis.epnscore, coreProvider);
      // initialise the read contract for the communicator function
      const commAddress = onCoreNetwork ? addresses.epnsEthComm : addresses.epnsPolyComm;
      const commContractInstance = new ethers.Contract(commAddress, abis.epnsComm, library);
      dispatch(setCommunicatorReadProvider(commContractInstance));
      dispatch(setCoreReadProvider(coreContractInstance));
    })();
  }, [account, chainId]);

  // toast customize
  const LoaderToast = ({ msg, color }) => (
    <Toaster>
      <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={30} spinnerColor={color} />
      <ToasterMsg>{msg}</ToasterMsg>
    </Toaster>
  );

  const NormalToast = ({ msg }) => (
    <Toaster>
      <ToasterMsg>{msg}</ToasterMsg>
    </Toaster>
  );

  // notification toast
  let notificationToast = () =>
    toaster.dark(<LoaderToast msg="Preparing Notification" color="#fff" />, {
      position: 'bottom-right',
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });

  /**
   * When we instantiate the contract instances, fetch basic information about the user
   * Corresponding channel owned.
   */
  React.useEffect(() => {
    if (!epnsReadProvider || !epnsCommReadProvider) return;

    // save push admin to global state
    epnsReadProvider
      .pushChannelAdmin()
      .then((response) => {
        dispatch(setPushAdmin(response));
      })
      .catch((err) => {
        console.log({ err });
      });

    // Push (EPNS) Read Provider Set
    if (epnsReadProvider != null && epnsCommReadProvider != null) {
      // Instantiate Data Stores
      UsersDataStore.instance.init(account, epnsReadProvider, epnsCommReadProvider);
      ChannelsDataStore.instance.init(account, epnsReadProvider, epnsCommReadProvider, chainId);
    }
  }, [epnsReadProvider, epnsCommReadProvider]);

  // const registerPubKey = async (encryptionPublicKey) => {
  //   let txToast;
  //   try {
  //     const type = {
  //       Register: [
  //         { name: 'user', type: 'address' },
  //         { name: 'encryptionKey', type: 'string' },
  //         { name: 'action', type: 'string' },
  //       ],
  //     };

  //     const message = {
  //       user: account,
  //       encryptionKey: encryptionPublicKey,
  //       action: 'Register',
  //     };

  //     let EPNS_DOMAIN = {
  //       name: 'EPNS COMM V1',
  //       chainId: chainId,
  //       verifyingContract: epnsCommReadProvider?.address,
  //     };

  //     // loader toast
  //     txToast = toaster.dark(<LoaderToast msg="Waiting for Confirmation..." color="#35c5f3" />, {
  //       position: 'bottom-right',
  //       autoClose: false,
  //       hideProgressBar: true,
  //       closeOnClick: true,
  //       pauseOnHover: true,
  //       draggable: true,
  //       progress: undefined,
  //     });

  //     const signature = await library.getSigner(account)._signTypedData(EPNS_DOMAIN, type, message);

  //     const objPayload = {
  //       address: account,
  //       encryptionKey: encryptionPublicKey,
  //       signature,
  //       message,
  //       op: 'write',
  //       chainId,
  //       contractAddress: epnsCommReadProvider.address,
  //     };

  //     const result = await postReq('/encryption_key/register', objPayload);
  //     console.log(result);

  //     toaster.update(txToast, {
  //       render: 'Successfully enabled secret notifications !',
  //       type: toaster.TYPE.SUCCESS,
  //       autoClose: 5000,
  //     });

  //     setEnabledSecretNotif(true);
  //   } catch (err) {
  //     if (err.code === 4001) {
  //       // EIP-1193 userRejectedRequest error
  //       toaster.update(txToast, {
  //         render: 'User denied message signature.',
  //         type: toaster.TYPE.ERROR,
  //         autoClose: 5000,
  //       });
  //     } else {
  //       toaster.update(txToast, {
  //         render: 'There was an error registering the public key',
  //         type: toaster.TYPE.ERROR,
  //         autoClose: 5000,
  //       });
  //       console.log(err);
  //     }
  //   }
  // };

  // const enableSecretNotif = async () => {
  //   let txToast;
  //   if (enabledSecretNotif) {
  //     txToast = toaster.dark(<NormalToast msg="Secret Notifications are already enabled." />, {
  //       position: 'bottom-right',
  //       type: toaster.TYPE.SUCCESS,
  //       autoClose: 3000,
  //       hideProgressBar: true,
  //       closeOnClick: true,
  //       pauseOnHover: true,
  //       draggable: true,
  //       progress: undefined,
  //     });
  //     return;
  //   }
  //   if (!epnsCommReadProvider?.address) return;
  //   let encryptionPublicKey;
  //   await library.provider
  //     .request({
  //       method: 'eth_getEncryptionPublicKey',
  //       params: [account], // you must have access to the specified account
  //     })
  //     .then((result) => {
  //       encryptionPublicKey = result;
  //       registerPubKey(encryptionPublicKey);
  //       console.log(result);
  //     })
  //     .catch((error) => {
  //       if (error.code === 4001) {
  //         // EIP-1193 userRejectedRequest error
  //         console.log('User Rejected the Request to the Key');
  //         txToast = toaster.dark(<NormalToast msg="User denied message EncryptionPublicKey" />, {
  //           position: 'bottom-right',
  //           type: toaster.TYPE.ERROR,
  //           autoClose: 5000,
  //           hideProgressBar: true,
  //           closeOnClick: true,
  //           pauseOnHover: true,
  //           draggable: true,
  //           progress: undefined,
  //         });
  //       } else if (error.code === -32601) {
  //         console.error(error);
  //         txToast = toaster.dark(<NormalToast msg="Your wallet doesn't support providing public encryption key." />, {
  //           position: 'bottom-right',
  //           type: toaster.TYPE.ERROR,
  //           autoClose: 5000,
  //           hideProgressBar: true,
  //           closeOnClick: true,
  //           pauseOnHover: true,
  //           draggable: true,
  //           progress: undefined,
  //         });
  //       } else {
  //         console.error(error);
  //         txToast = toaster.dark(<NormalToast msg="There was an error getting public encryption key." />, {
  //           position: 'bottom-right',
  //           type: toaster.TYPE.ERROR,
  //           autoClose: 5000,
  //           hideProgressBar: true,
  //           closeOnClick: true,
  //           pauseOnHover: true,
  //           draggable: true,
  //           progress: undefined,
  //         });
  //       }
  //     });
  // };

  // Render
  return (
    <Container>
      {/* <Item>
        <Item margin="16px 20px 0px 0px" self="self-end">
          <Button
            padding="12px"
            direction="row"
            border={`1px solid ${themes.faucetBorder}`}
            bg={
              themes.scheme === "light"
                ? GLOBALS.COLORS.GRADIENT_PRIMARY
                : GLOBALS.COLORS.GRADIENT_SECONDARY
            }
            radius="50px"
            onClick={enableSecretNotif}
            disabled={enabledSecretNotif}
          >
            <span style={{ color: "#fff" }}>
              {enabledSecretNotif ? 'Secret Notifications are enabled' : 'Enable Secret Notifications'}
            </span>
            <></>
          </Button>
        </Item>
      </Item> */}
      <div className="joyride"></div>
      <InboxComponent />
      {/* <Feedbox /> */}
      {toast && <NotificationToast notification={toast} clearToast={clearToast} />}
    </Container>
  );
};
export default InboxModule;

// css style
const Container = styled(Section)`
  align-items: stretch;
  align-self: stretch;
  flex: 1;
  background: ${(props) => props.theme.default.bg};
  border-top-left-radius: ${GLOBALS.ADJUSTMENTS.RADIUS.LARGE};
  box-shadow: ${GLOBALS.ADJUSTMENTS.MODULE_BOX_SHADOW};
  display: flex;
  flex-direction: column;
  flex: initial;
  justify-content: center;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;

  margin: ${GLOBALS.ADJUSTMENTS.MARGIN.BIG_MODULES.DESKTOP};
  height: calc(
    100vh - ${GLOBALS.CONSTANTS.HEADER_HEIGHT}px - ${globalsMargin.BIG_MODULES.DESKTOP.TOP} -
      ${globalsMargin.BIG_MODULES.DESKTOP.BOTTOM}
  );

  @media ${device.laptop} {
    margin: ${GLOBALS.ADJUSTMENTS.MARGIN.BIG_MODULES.TABLET};
    height: calc(
      100vh - ${GLOBALS.CONSTANTS.HEADER_HEIGHT}px - ${globalsMargin.BIG_MODULES.TABLET.TOP} -
        ${globalsMargin.BIG_MODULES.TABLET.BOTTOM}
    );
    border-radius: ${GLOBALS.ADJUSTMENTS.RADIUS.LARGE};
  }

  @media ${device.mobileM} {
    margin: ${GLOBALS.ADJUSTMENTS.MARGIN.BIG_MODULES.MOBILE};
    height: calc(
      100vh - ${GLOBALS.CONSTANTS.HEADER_HEIGHT}px - ${globalsMargin.BIG_MODULES.MOBILE.TOP} -
        ${globalsMargin.BIG_MODULES.MOBILE.BOTTOM}
    );
    border: ${GLOBALS.ADJUSTMENTS.RADIUS.LARGE};
    border-radius: ${GLOBALS.ADJUSTMENTS.RADIUS.LARGE};
  }
`;

const Toaster = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0px 10px;
`;

const ToasterMsg = styled.div`
  margin: 0px 10px;
`;
