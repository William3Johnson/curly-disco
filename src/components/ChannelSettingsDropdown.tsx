// React + Web3 Essentials
import { useWeb3React } from '@web3-react/core';
import React from 'react';

// External Packages
import 'react-dropdown/style.css';
import { AiOutlineDropbox, AiOutlineUserAdd, AiOutlineUserDelete, AiTwotoneDelete } from 'react-icons/ai';
import { useDispatch, useSelector } from 'react-redux';
import { toast as toaster } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import { useClickAway } from 'react-use';
import styled, { css, useTheme } from 'styled-components';

// Internal Compoonents
import { postReq } from 'api';
import LoaderSpinner, { LOADER_TYPE } from 'components/reusables/loaders/LoaderSpinner';
import EPNSCoreHelper from 'helpers/EPNSCoreHelper';
import useModal from 'hooks/useModal';
import useToast from 'hooks/useToast';
import { setUserChannelDetails } from 'redux/slices/adminSlice';
import cubeIcon from '../assets/icons/cube.png';
import redBellIcon from '../assets/icons/redBellSlash.png';
import userMinusIcon from '../assets/icons/userCircleMinus.png';
import userPlusIcon from '../assets/icons/userCirclePlus.png';
import ActivateChannelModal from './ActivateChannelModal';
import AddDelegateModalContent from './AddDelegateModalContent';
import AddSubgraphModalContent from './AddSubgraphModalContent';
import ChannelDeactivateModalContent from './ChannelDeactivateModalContent';
import RemoveDelegateModalContent from './RemoveDelegateModalContent';

// Internal Configs
import { abis, addresses, appConfig } from 'config';

const ethers = require('ethers');

const MIN_STAKE_FEES = 50;
const ALLOWED_CORE_NETWORK = appConfig.coreContractChain;

type ChannelSettingsType = {
  DropdownRef: React.MutableRefObject<any>;
  isDropdownOpen: boolean;
  closeDropdown: () => void;
};

// Create Header
function ChannelSettings({ DropdownRef, isDropdownOpen, closeDropdown }: ChannelSettingsType) {
  const dispatch = useDispatch();
  const { account, library, chainId } = useWeb3React();
  const { epnsWriteProvider, epnsCommWriteProvider } = useSelector((state: any) => state.contracts);
  const { channelDetails } = useSelector((state: any) => state.admin);
  const { CHANNNEL_DEACTIVATED_STATE, CHANNEL_BLOCKED_STATE, CHANNEL_ACTIVE_STATE } = useSelector(
    (state: any) => state.channels
  );

  const theme = useTheme();
  const { channelState } = channelDetails;
  const onCoreNetwork = ALLOWED_CORE_NETWORK === chainId;

  // modals
  const {
    isModalOpen: isDeactivateChannelModalOpen,
    showModal: showDeactivateChannelModal,
    ModalComponent: DeactivateChannelModalComponent,
  } = useModal();
  const {
    isModalOpen: isAddDelegateModalOpen,
    showModal: showAddDelegateModal,
    ModalComponent: AddDelegateModalComponent,
  } = useModal();
  const {
    isModalOpen: isRemoveDelegateModalOpen,
    showModal: showRemoveDelegateModal,
    ModalComponent: RemoveDelegateModalComponent,
  } = useModal();
  const {
    isModalOpen: isAddSubgraphModalOpen,
    showModal: showAddSubgraphModal,
    ModalComponent: AddSubgraphModalComponent,
  } = useModal();

  // for closing the ChannelSettings Dropdown upon outside click
  const closeDropdownCondition =
    isDropdownOpen &&
    !isDeactivateChannelModalOpen &&
    !isAddDelegateModalOpen &&
    !isRemoveDelegateModalOpen &&
    !isAddSubgraphModalOpen;
  useClickAway(DropdownRef, () => closeDropdownCondition && closeDropdown());

  const [loading, setLoading] = React.useState(false);
  const [showActivateChannelPopup, setShowActivateChannelPopup] = React.useState(false);
  const [channelStakeFees, setChannelStakeFees] = React.useState(MIN_STAKE_FEES);
  const [poolContrib, setPoolContrib] = React.useState(0);

  // toaster customize
  const LoaderToast = ({ msg, color }) => (
    <Toaster>
      <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={30} />
      <ToasterMsg>{msg}</ToasterMsg>
    </Toaster>
  );

  // Toastify
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

  const isChannelDeactivated = channelState === CHANNNEL_DEACTIVATED_STATE;
  const isChannelBlocked = channelState === CHANNEL_BLOCKED_STATE;
  const channelInactive = isChannelBlocked || isChannelDeactivated;

  React.useEffect(() => {
    // To set channel info from a channel details
    // setChannelState(channelDetails.channelState);
    setPoolContrib(+EPNSCoreHelper.formatBigNumberToMetric(channelDetails.poolContribution, true));
  }, [account, channelDetails.poolContribution]);

  const toggleChannelActivationState = () => {
    if (isChannelBlocked) return;
    if (isChannelDeactivated) {
      setShowActivateChannelPopup(true);
    } else {
      showDeactivateChannelModal();
    }
  };

  /**
   * Function to activate a channel that has been deactivated
   */
  const activateChannel = async () => {
    // First Approve DAI
    setLoading(true);
    var signer = library.getSigner(account);
    let daiContract = new ethers.Contract(addresses.dai, abis.erc20, signer);
    const fees = ethers.utils.parseUnits(channelStakeFees.toString(), 18);
    var sendTransactionPromise = daiContract.approve(addresses.epnscore, fees);
    const tx = await sendTransactionPromise;

    console.log(tx);
    console.log('waiting for tx to finish');

    await library.waitForTransaction(tx.hash);
    await epnsWriteProvider
      .reactivateChannel(fees)
      .then(async (tx: any) => {
        console.log(tx);
        console.log('Transaction Sent!');

        toaster.update(notificationToast(), {
          render: 'Reactivating Channel',
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });

        await tx.wait(1);
        toaster.update(notificationToast(), {
          render: 'Channel Reactivated',
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });
        dispatch(
          setUserChannelDetails({
            ...channelDetails,
            channelState: CHANNEL_ACTIVE_STATE,
          })
        );
      })
      .catch((err: any) => {
        console.log('!!!Error reactivateChannel() --> %o', err);
        toaster.update(notificationToast(), {
          render: 'Transacion Failed: ' + err.error?.message || err.message,
          type: toaster.TYPE.ERROR,
          autoClose: 5000,
        });
      })
      .finally(() => {
        setLoading(false);
        setShowActivateChannelPopup(false);
      });
  };

  const deactivateChannelToast = useToast();
  /**
   * Function to deactivate a channel that has been deactivated
   */
  const deactivateChannel = async () => {
    if (!poolContrib) return;

    const amountToBeConverted = parseInt('' + poolContrib) - 10;
    console.log('Amount To be converted==>', amountToBeConverted);

    const { data: response } = await postReq('/channels/getDaiToPush', {
      value: amountToBeConverted,
    });

    const pushValue = response.response.data.quote.PUSH.price;

    return (
      epnsWriteProvider
        // .deactivateChannel(amountsOut.toString().replace(/0+$/, "")) //use this to remove trailing zeros 1232323200000000 -> 12323232
        .deactivateChannel(Math.floor(pushValue))
    );
  };

  const addDelegateToast = useToast();
  const addDelegate = async (walletAddress: string) => {
    return epnsCommWriteProvider.addDelegate(walletAddress);
  };

  const removeDelegateToast = useToast();
  const removeDelegate = (walletAddress: string) => {
    return epnsCommWriteProvider.removeDelegate(walletAddress);
  };

  const addSubgraphToast = useToast();
  const addSubgraphDetails = async (pollTime, subGraphId) => {
    // design not present to show below cases
    if (pollTime == '' || subGraphId == '') {
      // setLoading('Fields are empty! Retry');
      // setTimeout(() => {
      //     setLoading('')
      // }, 2000);
      return;
    } else if (pollTime < 60) {
      // setLoading('Poll Time must be at least 60 sec');
      // setTimeout(() => {
      //     setLoading('')
      // }, 2000);
      return;
    }

    try {
      const input = pollTime + '+' + subGraphId;

      // Prepare Identity bytes
      const identityBytes = ethers.utils.toUtf8Bytes(input);

      return epnsWriteProvider.addSubGraph(identityBytes);
    } catch (err) {
      console.log(err);
    }
  };

  // if (!onCoreNetwork) {
  //   //temporarily deactivate the deactivate button if not on core network
  //   return <></>;

  return (
    <>
      <div>
        <DropdownWrapper background={theme}>
          <ActiveChannelWrapper>
            {appConfig.appEnv !== 'prod' && (
              <ChannelActionButton
                disabled={channelInactive}
                onClick={() => !channelInactive && showAddSubgraphModal()}>
                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <CustomIcon src={cubeIcon} alt="cube" />
                  <div style={{ width: '10px' }} />
                  Add SubGraph Details
                </div>
              </ChannelActionButton>
            )}

            <ChannelActionButton disabled={channelInactive} onClick={() => !channelInactive && showAddDelegateModal()}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <CustomIcon src={userPlusIcon} alt="user-plus" />
                <div style={{ width: '10px' }} />
                Add Delegate
              </div>
            </ChannelActionButton>

            <ChannelActionButton
              disabled={channelInactive}
              onClick={() => !channelInactive && showRemoveDelegateModal()}>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <CustomIcon src={userMinusIcon} alt="user-minus" />
                <div style={{ width: '10px' }} />
                Remove Delegate
              </div>
            </ChannelActionButton>

            {onCoreNetwork &&
              <ChannelActionButton isChannelDeactivated={isChannelDeactivated} onClick={toggleChannelActivationState}>
                <div style={{ color: 'red' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <CustomIcon src={redBellIcon} alt="red-bell" />
                    <div style={{ width: '10px', color: 'red' }} />
                    {isChannelBlocked
                      ? 'Channel Blocked'
                      : isChannelDeactivated
                      ? 'Activate Channel'
                      : 'Deactivate Channel'}
                  </div>
                </div>
              </ChannelActionButton>
            }
          </ActiveChannelWrapper>
        </DropdownWrapper>

        {/* modal to display the activate channel popup */}
        {showActivateChannelPopup && (
          <ActivateChannelModal
            onClose={() => {
              if (showActivateChannelPopup) {
                setShowActivateChannelPopup(false);
              }
            }}
            activateChannel={activateChannel}
            loading={loading}
            setChannelStakeFees={setChannelStakeFees}
            channelStakeFees={channelStakeFees}
          />
        )}
      </div>

      {/* deactivate channel modal */}
      <DeactivateChannelModalComponent
        InnerComponent={ChannelDeactivateModalContent}
        onConfirm={deactivateChannel}
        toastObject={deactivateChannelToast}
      />

      {/* modal to add a delegate */}
      <AddDelegateModalComponent
        InnerComponent={AddDelegateModalContent}
        onConfirm={addDelegate}
        toastObject={addDelegateToast}
      />

      {/* modal to remove a delegate */}
      <RemoveDelegateModalComponent
        InnerComponent={RemoveDelegateModalContent}
        onConfirm={removeDelegate}
        toastObject={removeDelegateToast}
      />

      {/* modal to add a subgraph */}
      <AddSubgraphModalComponent
        InnerComponent={AddSubgraphModalContent}
        onConfirm={addSubgraphDetails}
        toastObject={addSubgraphToast}
      />
    </>
  );
}

// css styles
const DropdownWrapper = styled.div`
  position: absolute;
  right: 20px;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  width: 240px;
  padding: 16px 4px 24px 4px;
  background: ${(props) => props.background.backgroundBG};
  box-sizing: border-box;
  box-shadow: 0px 4px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e8f7;
  border-radius: 16px;
  justify-content: space-between;
`;

const ActiveChannelWrapper = styled.div`
  flex-direction: column;
  gap: 20px;
  display: ${(props) => (props.inactive ? 'none' : 'flex')};
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

const DeactivateButton = styled.div`
  text-decoration: underline;
  color: ${(props) => (props.isChannelDeactivated ? '#674C9F' : '#e20880')};
  text-align: center;
  font-size: 16px;
  line-height: 20px;
  cursor: pointer;
`;

const ChannelActionButton = styled.button`
  border: 0;
  outline: 0;
  padding: 8px 15px;
  border-radius: 5px;
  position: relative;
  background: ${(props) => props.theme.backgroundBG};
  color: ${(props) => props.theme.color};
  height: 23px;
  font-family: 'monospace, monospace';
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
  line-height: 141%;
  align-items: center;
  &:hover {
    opacity: ${(props) => (props.disabled ? 0.5 : 0.9)};
    cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
    pointer: hand;
  }
  &:active {
    opacity: ${(props) => (props.disabled ? 0.5 : 0.75)};
    cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
    pointer: hand;
  }
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
`;

const CustomIcon = styled.img`
  width: 25px;
  height: 25px;
  padding: 0;
  margin: 0;
`;

// Export Default
export default ChannelSettings;
