// React + Web3 Essentials
import { isCommunityResourcable } from "@ethersproject/providers";
import { useWeb3React } from "@web3-react/core";
import React, { useEffect } from "react";

// External Packages
import Skeleton from "@yisheng90/react-loading";
import { GoVerified } from "react-icons/go";
import { IoMdPeople } from "react-icons/io";
import { MdCheckCircle, MdError } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { toast as toaster } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import styled, { css, useTheme } from "styled-components";

// Internal Compoonents
import * as PushAPI from "@pushprotocol/restapi";
import { postReq } from "api";
import { Device } from "assets/Device";
import MetaInfoDisplayer from "components/MetaInfoDisplayer";
import LoaderSpinner, { LOADER_TYPE } from 'components/reusables/loaders/LoaderSpinner';
import { convertAddressToAddrCaip } from "helpers/CaipHelper";
import useToast from "hooks/useToast";
import { cacheChannelInfo, cacheSubscribe, cacheUnsubscribe, updateSubscriptionStatus } from "redux/slices/channelSlice";
import {
  addNewWelcomeNotif, incrementStepIndex
} from "redux/slices/userJourneySlice";
import ChannelTutorial, {
  isChannelTutorialized
} from "segments/ChannelTutorial";
import ChannelsDataStore from "singletons/ChannelsDataStore";
import NotificationToast from "../primaries/NotificationToast";
import { Image, ItemH, Span } from "../primaries/SharedStyling";
import { aliasChainIdsMapping, MaskedPolygonChannels } from "helpers/UtilityHelper";

// Internal Configs
import { appConfig } from "config";

// Create Header
function ViewChannelItem({ channelObjectProp, loadTeaser, playTeaser }) {
  const dispatch = useDispatch();

  const themes = useTheme();

  const { run, stepIndex } = useSelector((state) => state.userJourney);
  

  const {
    epnsReadProvider,
    epnsWriteProvider,
    epnsCommReadProvider,
    pushAdminAddress,
    ZERO_ADDRESS,
  } = useSelector((state) => state.contracts);
  const { canVerify } = useSelector((state) => state.admin);
  const { channelsCache, CHANNEL_BLACKLIST, subscriptionStatus } = useSelector(
    (state) => state.channels
  );
  const { account, library, chainId } = useWeb3React();

  const onCoreNetwork = chainId === appConfig.coreContractChain;

  const [channelObject, setChannelObject] = React.useState({});
  const [channelJson, setChannelJson] = React.useState({});
  const [subscribed, setSubscribed] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [subscriberCount, setSubscriberCount] = React.useState(0);
  const [isPushAdmin, setIsPushAdmin] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [vLoading, setvLoading] = React.useState(false);
  const [bLoading, setBLoading] = React.useState(false);
  const [txInProgress, setTxInProgress] = React.useState(false);
  const [canUnverify, setCanUnverify] = React.useState(false);
  const [verifierDetails, setVerifierDetails] = React.useState(null);
  const [copyText, setCopyText] = React.useState(null);

  // ------ toast related section
  const isChannelBlacklisted = CHANNEL_BLACKLIST.includes(channelObject.channel);
  const [toast, showToast] = React.useState(null);
  const clearToast = () => showToast(null);

  let isOwner;
  if (!onCoreNetwork) {
    isOwner = channelObject.alias_address === account;
  } else {
    isOwner = channelObject.channel === account;
  }

  //clear toast variable after it is shown
  React.useEffect(() => {
    if (toast) {
      clearToast();
    }
  }, [toast]);
  // ------ toast related section

  useEffect(() => {
    if (!channelObject.channel) return;
    setSubscribed(subscriptionStatus[channelObject.channel]);
  }, [channelObject]);

  React.useEffect(() => {
    if (!channelObject.channel) return;
    if (channelObject.verifiedBy) {
      // procced as usual
      fetchChannelJson().catch((err) => alert(err.message));
      setIsBlocked(
        channelObject.channelState === 3 || channelObject.channelState === 2 //dont display channel if blocked //dont display channel if deactivated
      );
    } else {
      // if this key (verifiedBy) is not present it means we are searching and should fetch the channel object from chain again
      epnsReadProvider.channels(channelObject.channel).then((response) => {
        setChannelObject({
          ...response,
          channel: channelObject.channel,
          alias_address: channelObject.alias_address,
          subscriber_count: channelObject.subscriber_count,
        });
        fetchChannelJson();
      });
    }
  }, [account, channelObject, chainId]);

  React.useEffect(() => {
    if (!channelObjectProp) return;
    setChannelObject(channelObjectProp);
  }, [channelObjectProp]);

  React.useEffect(() => {
    if (!isVerified || channelObject?.verifiedBy === ZERO_ADDRESS) return;
    ChannelsDataStore.instance
      .getChannelJsonAsync(channelObject.verifiedBy)
      .then((verifierDetails) => {
        setVerifierDetails(verifierDetails);
      })
      .catch((err) => {
        console.log(channelObject.verifiedBy, err);
      });
  }, [isVerified, channelObject]);

  const EPNS_DOMAIN = {
    name: "EPNS COMM V1",
    chainId: chainId,
    verifyingContract: epnsCommReadProvider.address,
  };
  // to fetch channels
  const fetchChannelJson = async () => {
    try {
      let channelJson = {};
      setCopyText(channelObject.channel);
      if (channelsCache[channelObject.channel]) {
        channelJson = channelsCache[channelObject.channel];
      } else {
        channelJson = await ChannelsDataStore.instance.getChannelJsonAsync(
          channelObject.channel
        );
        dispatch(
          cacheChannelInfo({
            address: channelObject.channel,
            meta: channelJson,
          })
        );
      }
      let channelAddress = channelObject.channel;
      if (!onCoreNetwork) {
        channelAddress = channelObject.alias_address;
      }
      if (!channelAddress) return;

      setIsPushAdmin(pushAdminAddress === account);
      setSubscriberCount(channelObject.subscriber_count);
      setChannelJson({
        ...channelJson,
        channel: channelObject.channel,
        subscriber_count: channelObject.subscriber_count,
      });
      setLoading(false);
    } catch (err) {
      setIsBlocked(true);
    }
  };

  React.useEffect(() => {
    if (!channelObject) return;
    setIsVerified(
      Boolean(
        (channelObject.verifiedBy &&
          channelObject.verifiedBy !== ZERO_ADDRESS) ||
          channelObject.channel === pushAdminAddress
      )
    );
    setCanUnverify(channelObject.verifiedBy == account);
  }, [channelObject]);

  // toast customize
  const LoaderToast = ({ msg, color }) => (
    <Toaster>
      <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={30} spinnerColor={color} />
      <ToasterMsg>{msg}</ToasterMsg>
    </Toaster>
  );

  // to subscribe
  const subscribe = async () => {
    console.log("click executed");
    subscribeAction(false);
  };

  const formatAddress = (addressText) => {
    return addressText.length > 40
      ? `${addressText.slice(0, 4)}....${addressText.slice(36)}`
      : addressText;
  };

  // Toastify
  let notificationToast = () =>
    toaster.dark(<LoaderToast msg="Preparing Notification" color="#fff" />, {
      position: "bottom-right",
      autoClose: false,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });

  const verifyChannel = () => {
    setvLoading(true);
    // post op
    epnsWriteProvider
      .verifyChannel(channelObject.channel)
      .then(async (tx) => {
        console.log(tx);
        console.log("Transaction Sent!");

        toaster.update(notificationToast(), {
          render: "Transaction sent",
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });

        // await tx.wait(1);
        // console.log ("Transaction Mined!");
        setIsVerified(true);
      })
      .catch((err) => {
        console.log("!!!Error verifyChannel() --> %o", err);
        toaster.update(notificationToast(), {
          render: "Transacion Failed: " + err.error?.message || "Unknown Error",
          type: toaster.TYPE.ERROR,
          autoClose: 5000,
        });
      })
      .finally(() => {
        setvLoading(false);
      });
  };

  const unverifyChannel = () => {
    setvLoading(true);
    epnsWriteProvider
      .unverifyChannel(channelObject.channel)
      .then(async (tx) => {
        console.log(tx);
        console.log("Transaction Sent!");

        toaster.update(notificationToast(), {
          render: "Transaction sent",
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });

        await tx.wait(1);
        console.log("Transaction Mined!");
        setIsVerified(false);
      })
      .catch((err) => {
        console.log("!!!Error handleSendMessage() --> %o", err);
        toaster.update(notificationToast(), {
          render: "Transacion Failed: " + err.error?.message || "Unknown Error",
          type: toaster.TYPE.ERROR,
          autoClose: 5000,
        });
      });
    setvLoading(false);
  };
  const blockChannel = () => {
    setBLoading(true);
    epnsWriteProvider
      .blockChannel(channelObject.channel)
      .then(async (tx) => {
        console.log(tx);
        console.log("Transaction Sent!");

        toaster.update(notificationToast(), {
          render: "Transaction Sent",
          type: toaster.TYPE.INFO,
          autoClose: 5000,
        });

        // await tx.wait(1);
        // console.log ("Transaction Mined!");
      })
      .catch((err) => {
        console.log("!!!Error handleSendMessage() --> %o", err);
        toaster.update(notificationToast(), {
          render: "Transacion Failed: " + err.error.message,
          type: toaster.TYPE.ERROR,
          autoClose: 5000,
        });
      })
      .finally(() => {
        // post op
        setBLoading(false);
        setIsBlocked(true);
      });
  };

  const subscribeToast = useToast();
  const subscribeAction = async () => {
    setTxInProgress(true);
    // let txToast;
    try {
      // const type = {
      //   Subscribe: [
      //     { name: "channel", type: "address" },
      //     { name: "subscriber", type: "address" },
      //     { name: "action", type: "string" },
      //   ],
      // };

      let channelAddress = channelObject.channel;
      // if (!onCoreNetwork) {
      //   channelAddress = channelObject.alias_address;
      // }

      // const message = {
      //   channel: channelAddress,
      //   subscriber: account,
      //   action: "Subscribe",
      // };

      // const signature = await library
      //   .getSigner(account)
      //   ._signTypedData(EPNS_DOMAIN, type, message);
      // subscribeToast.showToast("Waiting for Confirmation...");

      subscribeToast.showLoaderToast({loaderMessage: "Waiting for Confirmation..."});

      if (run) {
        const type = {
          Subscribe: [
            { name: "channel", type: "address" },
            { name: "subscriber", type: "address" },
            { name: "action", type: "string" },
          ],
        };
        
        const message = {
          channel: channelAddress,
          subscriber: account,
          action: "Subscribe",
        };

        await library
          .getSigner(account)
          ._signTypedData(EPNS_DOMAIN, type, message);
        
        console.log("in run");
        subscribeToast.showMessageToast({
          toastTitle:"Success", 
          toastMessage: "Successfully opted into channel !", 
          toastType: "SUCCESS", 
          getToastIcon: (size) => <MdCheckCircle size={size} color="green" />
        })

        dispatch(
          addNewWelcomeNotif({
            cta: "",
            title: channelJson.info,
            message: `Welcome to ${channelJson.name} Channel. From now onwards, you'll be getting notifications from this channel`,
            icon: channelJson.icon,
            url: channelJson.url,
            sid: "",
            app: channelJson.name,
            image: "",
          })
        );
        setTxInProgress(false);
        setSubscribed(true);
        if (stepIndex === 5) {
          console.log("this is working");
          dispatch(incrementStepIndex());
        }
        return;
      }

      const _signer = await library.getSigner(account);
      await PushAPI.channels.subscribe({
        signer: _signer,
        channelAddress: convertAddressToAddrCaip(channelAddress, chainId), // channel address in CAIP
        userAddress: convertAddressToAddrCaip(account, chainId), // user address in CAIP
        onSuccess: () => {
          // dispatch(cacheSubscribe({ channelAddress: channelObject.channel }));
          dispatch(updateSubscriptionStatus({ channelAddress: channelObject.channel, status: true }));
          setSubscribed(true);
          setSubscriberCount(subscriberCount + 1);

          subscribeToast.showMessageToast({
            toastTitle:"Success", 
            toastMessage: "Successfully opted into channel !", 
            toastType: "SUCCESS", 
            getToastIcon: (size) => <MdCheckCircle size={size} color="green" />
        })
        },
        onError: () => {
          console.error('opt in error');
          subscribeToast.showMessageToast({
            toastTitle:"Error", 
            toastMessage: `There was an error opting into channel`, 
            toastType:  "ERROR", 
            getToastIcon: (size) => <MdError size={size} color="red" />
          })
        },
        env: appConfig.pushNodesEnv
      })

      // postReq("/channels/subscribe", {
      //   signature,
      //   message,
      //   op: "write",
      //   chainId,
      //   contractAddress: epnsCommReadProvider.address,
      // }).then((res) => {
      //   dispatch(cacheSubscribe({ channelAddress: channelObject.channel }));
      //   setSubscribed(true);
      //   setSubscriberCount(subscriberCount + 1);

      //   subscribeToast.updateToast(
      //     "Success",
      //     "Successfully opted into channel !",
      //     "SUCCESS",
      //     (size) => <MdCheckCircle size={size} color="green" />
      //   );

      //   console.log(res);
      //   setTxInProgress(false);
      // });
    } catch (err) {
      subscribeToast.showMessageToast({
        toastTitle:"Error", 
        toastMessage: `There was an error opting into channel ( ${err.message} )`, 
        toastType: "ERROR", 
        getToastIcon: (size) => <MdError size={size} color="red" />
      })

      console.log(err);
    } finally {
      setTxInProgress(false);
    }
  };

  const copyToClipboard = (address) => {
    let hostname = window.location.hostname;
    // if we are on localhost, attach the port
    if (hostname === "localhost") {
      hostname = hostname + ":3000";
    }
    const url = `${hostname}/#/channels?channel=${address}`;
    // fallback for non navigator browser support
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    } else {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  const unsubscribeToast = useToast();
  const unsubscribeAction = async () => {
    // let txToast;
    try {
      // const type = {
      //   Unsubscribe: [
      //     { name: "channel", type: "address" },
      //     { name: "unsubscriber", type: "address" },
      //     { name: "action", type: "string" },
      //   ],
      // };

      let channelAddress = channelObject.channel;
      // if (!onCoreNetwork) {
      //   channelAddress = channelObject.alias_address;
      // }

      // const message = {
      //   channel: channelAddress,
      //   unsubscriber: account,
      //   action: "Unsubscribe",
      // };
      // const signature = await library
      //   .getSigner(account)
      //   ._signTypedData(EPNS_DOMAIN, type, message);

      unsubscribeToast.showLoaderToast({loaderMessage: "Waiting for Confirmation..."});

      const _signer = await library.getSigner(account);
      await PushAPI.channels.unsubscribe({
        signer: _signer,
        channelAddress: convertAddressToAddrCaip(channelAddress, chainId), // channel address in CAIP
        userAddress: convertAddressToAddrCaip(account, chainId), // user address in CAIP
        onSuccess: () => {
          // dispatch(cacheUnsubscribe({ channelAddress: channelObject.channel }));
          dispatch(updateSubscriptionStatus({ channelAddress: channelObject.channel, status: false }));
          setSubscribed(false);
          setSubscriberCount(subscriberCount - 1);

          unsubscribeToast.showMessageToast({
            toastTitle:"Success", 
            toastMessage: "Successfully opted out of channel !", 
            toastType: "SUCCESS", 
            getToastIcon: (size) => <MdCheckCircle size={size} color="green" />
          })
        },
        onError: () => {
          console.error('opt out error');
          unsubscribeToast.showMessageToast({
            toastTitle:"Error", 
            toastMessage: `There was an error opting out of channel`, 
            toastType: "ERROR", 
            getToastIcon: (size) => <MdError size={size} color="red" />
          })
        },
        env: appConfig.pushNodesEnv
      })

      // postReq("/channels/unsubscribe", {
      //   signature,
      //   message,
      //   op: "write",
      //   chainId,
      //   contractAddress: epnsCommReadProvider.address,
      // })
      //   .then((res) => {
      //     dispatch(cacheUnsubscribe({ channelAddress: channelObject.channel }));
      //     setSubscribed(false);
      //     setSubscriberCount(subscriberCount - 1);

      //     // toaster.update(txToast, {
      //     //   render: "Successfully opted out of channel !",
      //     //   type: toaster.TYPE.SUCCESS,
      //     //   autoClose: 5000,
      //     // });
      //     unsubscribeToast.updateToast(
      //       "Success",
      //       "Successfully opted out of channel !",
      //       "SUCCESS",
      //       (size) => <MdCheckCircle size={size} color="green" />
      //     );

      //     console.log(res);
      //   })
      //   .catch((err) => {
      //     // toaster.update(txToast, {
      //     //   render:
      //     //     "There was an error opting into channel (" + err.message + ")",
      //     //   type: toaster.TYPE.ERROR,
      //     //   autoClose: 5000,
      //     // });
      //     unsubscribeToast.updateToast(
      //       "Error",
      //       `There was an error opting into channel ( ${err.message} )`,
      //       "ERROR",
      //       (size) => <MdError size={size} color="red" />
      //     );

      //     console.log(err);
      //   })
      //   .finally(() => {
      //     setTxInProgress(false);
      //   });
    } catch (err) {
      unsubscribeToast.showMessageToast({
        toastTitle:"Error", 
        toastMessage: `There was an error opting out of channel ( ${err.message} )`, 
        toastType: "ERROR", 
        getToastIcon: (size) => <MdError size={size} color="red" />
      })

      console.log(err);
    } finally {
      setTxInProgress(false);
    }
  };

  const correctChannelTitleLink = () => {
    const channelLink = CTA_OVERRIDE_CACHE[channelObject.channel] || channelJson.url;
    if(/(?:http|https):\/\//i.test(channelLink)) {
      window.open(channelLink, '_blank', 'noopener,noreferrer');
    }
    else{
      window.open(`https://${channelLink}`, '_blank', 'noopener,noreferrer');
    }
  }
  const CTA_OVERRIDE_CACHE = {
    "0xb1676B5Ab63F01F154bb9938F5e8999d9Da5444B": "https://boardroom.io/",
    "0x7DA9A33d15413F499299687cC9d81DE84684E28E":
      "https://rmm.realtoken.network/dashboard",
    "0x90A48D5CF7343B08dA12E067680B4C6dbfE551Be": "https://shapeshift.com",
  };
  if (isBlocked) return <></>;
  if (isChannelBlacklisted) return <></>;

  // render
  return (
    <Container key={channelObject.channel}>
      <ChannelLogo>
        <ChannelLogoOuter>
          <ChannelLogoInner>
            {loading ? (
              <Skeleton color={themes.interfaceSkeleton} height="100%" />
            ) : (
              <ChannelLogoImg src={`${channelJson.icon}`} />
            )}
          </ChannelLogoInner>
        </ChannelLogoOuter>
      </ChannelLogo>

      <ChannelInfo>
        <ChannelTitle>
          {loading ? (
            <Skeleton
              color={themes.interfaceSkeleton}
              width="50%"
              height={24}
            />
          ) : (
            <ChannelTitleLink
              onClick = {()=>correctChannelTitleLink()}
            >
              <Span style={{display: "flex", alignItems: "center"}}>
                {channelJson.name}
                {isVerified && (
                  <Span margin="0px 5px" style={{display: "flex"}}>
                    <GoVerified
                      size={18}
                      color={themes.viewChannelVerifiedBadge}
                    />
                  </Span>
                )}
                {channelObject.channel && 
                  <Span padding="0 0 0 5px">
                    <Image src={`./svg/Ethereum.svg`} alt="Ethereum" width="20px" height="20px" />
                  </Span>
                }
                {channelObject.alias_address != null && channelObject.alias_address != "NULL" && appConfig.allowedNetworks.includes(aliasChainIdsMapping[appConfig.coreContractChain]) && !MaskedPolygonChannels[channelObject.channel] &&
                  <Span padding="0 0 0 5px">
                    <Image src={`./svg/Polygon.svg`} alt="Polygon" width="20px" height="20px" />
                  </Span>
                }
              </Span>
            </ChannelTitleLink>
          )}
        </ChannelTitle>

        <ChannelDesc>
          {loading ? (
            <>
              <SkeletonWrapper atH={5} atW={100}>
                <Skeleton
                  color={themes.interfaceSkeleton}
                  width="100%"
                  height={5}
                />
              </SkeletonWrapper>

              <SkeletonWrapper atH={5} atW={100}>
                <Skeleton
                  color={themes.interfaceSkeleton}
                  width="100%"
                  height={5}
                />
              </SkeletonWrapper>

              <SkeletonWrapper atH={5} atW={100}>
                <Skeleton
                  color={themes.interfaceSkeleton}
                  width="40%"
                  height={5}
                />
              </SkeletonWrapper>
            </>
          ) : (
            <ChannelDescLabel>{channelJson.info}</ChannelDescLabel>
          )}
        </ChannelDesc>

        <ChannelMeta>
          {loading ? (
            <>
              <SkeletonWrapper atH={10} atW={30} marginBottom="0">
                <Skeleton color={themes.interfaceSkeleton} />
              </SkeletonWrapper>
            </>
          ) : (
            <ItemH align="center" justify="flex-start" margin="0px -5px">
              <MetaInfoDisplayer
                externalIcon={
                  <Image src="./svg/users.svg" alt="users" width="14px"  height="14px"/>
                }
                internalIcon={null}
                text={subscriberCount}
                padding="5.3px 10px"
                bgColor={themes.viewChannelSecondaryBG}
                color={themes.viewChannelSecondaryText}
              />

              <MetaInfoDisplayer
                text={formatAddress(copyText)}
                bgColor={themes.viewChannelSearchBg}
                padding="6px 16px"
                color={themes.viewChannelPrimaryText}
                onClick={() => {
                  copyToClipboard(channelJson.channel);
                  setCopyText("copied");
                }}
                onMouseEnter={() => {
                  setCopyText("click to copy");
                }}
                onMouseLeave={() => {
                  setCopyText(channelJson.channel);
                }}
              />

              {isChannelTutorialized(channelObject.channel) && (
                <ChannelTutorial
                  addr={channelObject.channel}
                  bgColor={themes.viewChannelSearchBg}
                  loadTeaser={loadTeaser}
                  playTeaser={playTeaser}
                />
              )}

              {verifierDetails && (
                <Subscribers>
                  <VerifiedBy>Verified by:</VerifiedBy>
                  <VerifierIcon src={verifierDetails.icon} />
                  <VerifierName>{verifierDetails.name}</VerifierName>
                </Subscribers>
              )}
            </ItemH>
          )}
        </ChannelMeta>
      </ChannelInfo>
      {!!account && !!library && (
        <>
          <LineBreak />
          <ChannelActions>
            {loading && (
              <SkeletonButton>
                <Skeleton color={themes.interfaceSkeleton} />
              </SkeletonButton>
            )}
            {!loading && isPushAdmin && (
              <SubscribeButton onClick={blockChannel} disabled={bLoading}>
                {bLoading && (
                  <ActionLoader>
                    <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#FFF" />
                  </ActionLoader>
                )}
                <ActionTitle hideit={bLoading}>Block channel</ActionTitle>
              </SubscribeButton>
            )}
            {!loading && (isPushAdmin || canVerify) && !isVerified && (
              <SubscribeButton onClick={verifyChannel} disabled={vLoading}>
                {vLoading && (
                  <ActionLoader>
                    <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#FFF" />
                  </ActionLoader>
                )}
                <ActionTitle hideit={vLoading}>Verify Channel</ActionTitle>
              </SubscribeButton>
            )}
            {!loading && (isPushAdmin || canUnverify) && isVerified && (
              <UnsubscribeButton onClick={unverifyChannel} disabled={vLoading}>
                {vLoading && (
                  <ActionLoader>
                    <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#FFF" />
                  </ActionLoader>
                )}
                <ActionTitle hideit={vLoading}>Unverify Channel</ActionTitle>
              </UnsubscribeButton>
            )}
            {!loading && !subscribed && (
              <SubscribeButton
                onClick={subscribe}
                disabled={txInProgress}
                className="optin"
              >
                {txInProgress && (
                  <ActionLoader>
                    <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#FFF" />
                  </ActionLoader>
                )}
                <ActionTitle hideit={txInProgress}>Opt-In</ActionTitle>
              </SubscribeButton>
            )}
            {!loading && subscribed && (
              <>
                {isOwner && <OwnerButton disabled>Owner</OwnerButton>}
                {!isOwner && (
                  <UnsubscribeButton
                    onClick={unsubscribeAction}
                    disabled={txInProgress}
                  >
                    {txInProgress && (
                      <ActionLoader>
                        <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#FFF" />
                      </ActionLoader>
                    )}
                    <ActionTitle hideit={txInProgress}>Opt-out</ActionTitle>
                  </UnsubscribeButton>
                )}
              </>
            )}
          </ChannelActions>
        </>
      )}
      {toast && (
        <NotificationToast notification={toast} clearToast={clearToast} />
      )}
    </Container>
  );
}

const FlexBox = styled.div`
  display: flex;
`;

const ColumnFlex = styled(FlexBox)`
  flex-direction: column;
`;
// css styles
const Container = styled.div`
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  border: 1px solid ${(props) => props.theme.default.border};
  border-bottom:none;
  border-left:none;
  border-right:none;
  margin: 0px 5px;
  justify-content: center;
  padding: 25px 10px;

  align-self: stretch;
`;

const SkeletonWrapper = styled.div`
  overflow: hidden;
  width: ${(props) => props.atW + "%" || "100%"};
  height: ${(props) => props.atH}px;
  border-radius: ${(props) => props.borderRadius || 10}px;
  margin-bottom: ${(props) => props.marginBottom || 5}px;
  margin-right: ${(props) => props.marginRight || 0}px;
`;

const ChannelLogo = styled.div`
  max-width: 100px;
  min-width: 32px;
  flex: 1;
  margin: 5px;
  padding: 10px;
  border: 1px solid ${(props) => props.theme.viewChannelIconBorder};
  overflow: hidden;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-self: flex-start;
`;

const ChannelLogoOuter = styled.div`
  padding-top: 100%;
  position: relative;
`;

const ChannelLogoInner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ChannelLogoImg = styled.img`
  object-fit: contain;
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
`;

const ChannelInfo = styled.div`
  flex: 1;
  margin: 5px 10px;
  min-width: 240px;
  flex-grow: 4;
  flex-direction: column;
  display: flex;

  @media (max-width: 480px) {
    min-width: 210px;
  }
`;

const ChannelTitle = styled(ItemH)`
  padding: 5px 10px 5px 0px;
  justify-content: flex-start;
  margin: 0;
  flex: initial;
  align-items: center;
`;

const ChannelTitleLink = styled.a`
  text-decoration: none;
  display: flex;
  flex: 1;
  align-item: center;
  &:hover {
    text-decoration: underline;
    cursor: pointer;
    pointer: hand;
  }

  & > span {
    font-weight: 500;
    color: ${(props) => props.theme.viewChannelLink};
    font-size: 18px;
    cursor:pointer;
  }

  & > span > span {
    vertical-align: middle;
  }
`;

const VerifiedBy = styled.span`
  color: #ec008c;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: 0.05em;
  font-weight: 600;
`;

const VerifierIcon = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-left: 6px;
  margin-right: 4px;
`;

const VerifierName = styled.span`
  font-weight: 400;
  color: ${(props) => props.theme.color};
  font-size: 16px;
  letter-spacing: 0em;
`;

const ChannelDesc = styled.div`
  flex: 1;
  display: flex;
  font-size: 15px;
  color: rgba(0, 0, 0, 0.75);
  padding: 5px 0px 10px 0px;
  font-weight: 400;
  flex-direction: column;
  color: ${(props) => props.theme.color};
`;

const ChannelDescLabel = styled.label`
  flex: 1;
  line-height: 165%;
`;

const ChannelMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  padding: 5px 0px;
  font-size: 13px;
`;

const ChannelMetaBox = styled.label`
  margin: 0px 5px;
  color: #fff;
  font-weight: 600;
  padding: 5px 10px;
  display: flex;
  border-radius: 10px;
  font-size: 11px;
  gap: 3px;
`;

const Subscribers = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  align-items: center;
  @media ${Device.laptopL} {
    padding-top: 1rem;
  }
`;

const SubscribersCount = styled(ChannelMetaBox)`
  background: ${(props) => props.theme.viewChannelSecondaryBG};
  transition: 300ms;
`;

const Pool = styled.div`
  margin: 0px 10px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const PoolShare = styled(ChannelMetaBox)`
  background: #674c9f;
`;

const LineBreak = styled.div`
  display: none;
  flex-basis: 100%;
  height: 0;

  @media ${Device.tablet} {
    display: block;
  }
`;

const ChannelActions = styled.div`
  margin: 5px;
  flex-grow: 1;
  // max-width: 250px;
  display: flex;
  justify-content: flex-end;
  // justify-content: center;
  align-items: center;
`;

const ChannelActionButton = styled.button`
  border: 0;
  outline: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 15px;
  margin: 10px;
  color: #fff;
  border-radius: 5px;
  font-size: 14px;
  font-weight: 400;
  position: relative;
  &:hover {
    opacity: 0.9;
    cursor: pointer;
    pointer: hand;
  }
  &:active {
    opacity: 0.75;
    cursor: pointer;
    pointer: hand;
  }
  ${(props) =>
    props.disabled &&
    css`
      &:hover {
        opacity: 1;
        cursor: default;
        pointer: default;
      }
      &:active {
        opacity: 1;
        cursor: default;
        pointer: default;
      }
    `}
`;

const ActionTitle = styled.span`
  font-weight: 500;
  font-size: 14px;

  ${(props) =>
    props.hideit &&
    css`
      visibility: hidden;
    `};
`;

const ActionLoader = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const SkeletonButton = styled.div`
  border: 0;
  outline: 0;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 10px;
  border-radius: 5px;
  flex: 1;
`;

const SubscribeButton = styled(ChannelActionButton)`
  background: #e20880;
  border-radius: 8px;
  padding:9px 15px;
  min-width: 80px;
`;

const UnsubscribeButton = styled(ChannelActionButton)`
  background: transparent;
  color:${(props) => props.theme.viewChannelPrimaryText};
  border:1px solid #BAC4D6; 
  border-radius: 8px;
  padding:9px 15px;
  min-width: 80px;
`;

const OwnerButton = styled(ChannelActionButton)`
  background: #35c5f3;
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

// Export Default
export default ViewChannelItem;
