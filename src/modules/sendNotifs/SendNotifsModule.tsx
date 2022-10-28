import { useWeb3React } from '@web3-react/core';
import { abis, addresses, appConfig } from 'config';
import { ethers } from 'ethers';
import React from 'react';
import ReactGA from 'react-ga';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { getReq, postReq } from 'api';
import SendNotifications from 'components/SendNotifications';
import GLOBALS, { device, globalsMargin } from 'config/Globals';
import { convertAddressToAddrCaip } from 'helpers/CaipHelper';
import EPNSCoreHelper from 'helpers/EPNSCoreHelper';
import { Button, Item, ItemH, Section, Span } from 'primaries/SharedStyling';
import { Navigate } from 'react-router-dom';
import { setCanVerify, setDelegatees, setUserChannelDetails } from 'redux/slices/adminSlice';
import {
  setCommunicatorReadProvider,
  setCommunicatorWriteProvider,
  setCoreReadProvider,
  setCoreWriteProvider,
  setPushAdmin,
} from 'redux/slices/contractSlice';
import ChannelsDataStore from 'singletons/ChannelsDataStore';
import UsersDataStore from 'singletons/UsersDataStore';

export const ALLOWED_CORE_NETWORK = appConfig.coreContractChain; //chainId of network which we have deployed the core contract on
const CHANNEL_TAB = 2; //Default to 1 which is the channel tab

// Create Header
function ChannelDashboardPage() {
  ReactGA.pageview('/send_notificaiton');

  const dispatch = useDispatch();
  const { account, library, chainId } = useWeb3React();
  const { epnsReadProvider, epnsWriteProvider, epnsCommReadProvider } = useSelector((state: any) => state.contracts);
  const { channelDetails } = useSelector((state: any) => state.admin);

  const CORE_CHAIN_ID = appConfig.coreContractChain;
  const onCoreNetwork = CORE_CHAIN_ID === chainId;
  const INITIAL_OPEN_TAB = CHANNEL_TAB; //if they are not on a core network.redirect then to the notifications page

  const [controlAt, setControlAt] = React.useState(2);
  const [adminStatusLoaded, setAdminStatusLoaded] = React.useState(true);
  const [aliasEthAccount, setAliasEthAccount] = React.useState(null);
  const [aliasVerified, setAliasVerified] = React.useState(null); // null means error, false means unverified and true means verified
  const [channelAdmin, setChannelAdmin] = React.useState(true);
  const [channelJson, setChannelJson] = React.useState([]);

  // toast related section
  const [toast, showToast] = React.useState(null);
  const clearToast = () => showToast(null);

  //clear toast variable after it is shown
  React.useEffect(() => {
    if (toast) {
      clearToast();
    }
  }, [toast]);
  // toast related section

  /**
   * When we instantiate the contract instances, fetch basic information about the user
   * Corresponding channel owned.
   */
  // React.useEffect(() => {
  //   (async ()=>{
  //     if (!epnsReadProvider || !epnsCommReadProvider || !epnsWriteProvider) return;
  //     // Reset when account refreshes
  //     setChannelAdmin(false);
  //     dispatch(setUserChannelDetails('unfetched'));
  //     setAdminStatusLoaded(false);
  //     userClickedAt(INITIAL_OPEN_TAB);
  //     setChannelJson([]);

  //     // Push (EPNS) Read Provider Set
  //     if (epnsReadProvider != null && epnsCommReadProvider != null) {
  //       await checkUserForAlias();
  //       await checkUserForChannelOwnership();
  //       fetchDelegators();
  //     }
  //   })()
  // }, [epnsReadProvider, epnsCommReadProvider, epnsWriteProvider]);

  // handle user action at control center
  // const userClickedAt = (controlIndex) => {
  //   setControlAt(controlIndex);
  // };

  // // fetch all the channels who have delegated to this account
  // const fetchDelegators = () => {
  //   postReq('/channels/delegatee/getChannels', {
  //     delegateAddress: account,
  //     blockchain: blockchainName[chainId],
  //     op: 'read',
  //   })
  //     .then(async ({ data: delegators }) => {
  //       // if there are actual delegators
  //       // fetch basic information abouot the channels and store it to state
  //       if (delegators && delegators.channelOwners) {
  //         const channelInformationPromise = [
  //           ...new Set([account, ...delegators.channelOwners]), //make the accounts unique
  //         ].map((channelAddress) => {
  //           return ChannelsDataStore.instance
  //             .getChannelJsonAsync(channelAddress)
  //             .then((res) => ({ ...res, address: channelAddress }))
  //             .catch(() => false);
  //         });
  //         const channelInformation = await Promise.all(channelInformationPromise);
  //         dispatch(setDelegatees(channelInformation.filter(Boolean)));
  //         // fetch the json information about this delegatee channel and add to global state
  //       } else {
  //         dispatch(setDelegatees([]));
  //       }
  //     })
  //     .catch(async (err) => {
  //       console.log({ err });
  //     });
  // };

  // Check if a user is a channel or not
  // const checkUserForChannelOwnership = async () => {
  //   if (channelDetails != 'unfetched') return;
  //   if (!onCoreNetwork && aliasEthAccount == null) {
  //     setChannelAdmin(false);
  //     setAdminStatusLoaded(true);
  //     return;
  //   }
  //   // Check if account is admin or not and handle accordingly
  //   const ownerAccount = !onCoreNetwork ? aliasEthAccount : account;
  //   console.log(ownerAccount);
  //   EPNSCoreHelper.getChannelJsonFromUserAddress(ownerAccount, epnsReadProvider)
  //     .then(async (response) => {
  //       // if channel admin, then get if the channel is verified or not, then also fetch more details about the channel
  //       const verificationStatus = await epnsWriteProvider.getChannelVerfication(ownerAccount);
  //       const channelJson = await epnsWriteProvider.channels(ownerAccount);
  //       // const channelSubscribers = await ChannelsDataStore.instance.getChannelSubscribers(account);
  //       dispatch(
  //         setUserChannelDetails({
  //           ...response,
  //           ...channelJson,
  //           // subscribers: channelSubscribers,
  //         })
  //       );
  //       dispatch(setCanVerify(Boolean(verificationStatus)));
  //       setChannelJson(response);
  //       setChannelAdmin(true);
  //       setAdminStatusLoaded(true);
  //     })
  //     .catch((err) => {
  //       console.log('There was an error [checkUserForChannelOwnership]:', err.message);
  //       setChannelAdmin(false);
  //       setAdminStatusLoaded(true);
  //     })
  //     .finally(() => {
  //       setAdminStatusLoaded(true);
  //     });
  // };

  // Check if a user is a channel or not
  // const checkUserForAlias = async () => {
  //   // Check if account is admin or not and handle accordingly
  //   const userAddressInCaip = convertAddressToAddrCaip(account, chainId);
  //   await getReq(`/v1/alias/${userAddressInCaip}/channel`).then(({ data }) => {
  //     if (data) {
  //       setAliasEthAccount(data.channel);
  //       setAliasVerified(data.is_alias_verified);
  //     }
  //     return data;
  //   });
  // };

  // Render
  return (
    <Container>
      {controlAt === 2 && adminStatusLoaded ? (
        <>
          {/* redirect if not admin */}
          {!channelAdmin && <Navigate replace to="/dashboard" />}
          {channelAdmin && <SendNotifications />}
        </>
      ) : (
        <ChannelLoadingMessage>Channel details are being loaded, please wait…</ChannelLoadingMessage>
      )}
    </Container>
  );
}

// Define how the module is fitted, define it align-self to strect to fill entire bounds
// Define height: inherit to cover entire height
const Container = styled(Section)`
  align-items: center;
  align-self: center;
  background: ${(props) => props.theme.default.bg};
  border-radius: ${GLOBALS.ADJUSTMENTS.RADIUS.LARGE};
  box-shadow: ${GLOBALS.ADJUSTMENTS.MODULE_BOX_SHADOW};
  display: flex;
  flex-direction: column;
  flex: initial;
  justify-content: center;
  max-width: 1200px;
  width: calc(100% - ${globalsMargin.MINI_MODULES.DESKTOP.RIGHT} - ${globalsMargin.MINI_MODULES.DESKTOP.LEFT});
  position: relative;
  margin: ${GLOBALS.ADJUSTMENTS.MARGIN.MINI_MODULES.DESKTOP};

  @media ${device.laptop} {
    margin: ${GLOBALS.ADJUSTMENTS.MARGIN.MINI_MODULES.TABLET};
  }

  @media ${device.mobileM} {
    margin: ${GLOBALS.ADJUSTMENTS.MARGIN.MINI_MODULES.MOBILE};
  }
`;

// css style
const ChannelLoadingMessage = styled.div`
  width: 100%;
  padding: 40px;
  font-size: 1.5em;
  font-weight: 300;
  text-align: center;
  color: ${(props) => props.theme.color};
`;

// Export Default
export default ChannelDashboardPage;
