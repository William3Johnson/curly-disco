import EPNSCoreHelper from "helpers/EPNSCoreHelper";

import { getReq, postReq } from "api";
import { appConfig } from "config";

// STATIC SINGLETON
export const ChannelEvents = {
  ADD_CHANNEL_ANY: "AddChannelAny",
  ADD_CHANNEL_SELF: "AddChannelSelf",
  UPDATE_CHANNEL_ANY: "UpdateChannelAny",
  UPDATE_CHANNEL_SELF: "UpdateChannelSelf",
  SUBSCRIBER_ANY_CHANNEL: "SubscriberAnyChannel",
  SUBSCRIBER_SELF_CHANNEL: "SubscriberSelfChannel",
  UNSUBSCRIBER_ANY_CHANNEL: "UnsubscriberAnyChannel",
  UNSUBSCRIBER_SELF_CHANNEL: "UnsubscriberSelfChannel",
};

export default class ChannelsDataStore {
  static instance = ChannelsDataStore.instance || new ChannelsDataStore();

  state = {
    channelsCount: -1,
    channelsMeta: {},
    channelsJson: {},
    subscribers: {},
    subscribersCount: {},

    callbacks: [],

    account: null,
    epnsReadProvider: null,
    epnsCommReadProvider: null,
    chainId: null,
    onCoreNetwork: false,
  };

  // init
  init = (account, epnsReadProvider, epnsCommReadProvider, chainId) => {
    // set account
    this.state.account = account;

    // set chainId
    this.state.chainId = chainId;
    this.state.onCoreNetwork = chainId === appConfig.coreContractChain;

    // First attach listeners then overwrite the old one if any
    this.resetChannelsListeners();
    this.state.epnsReadProvider = epnsReadProvider;
    this.state.epnsCommReadProvider = epnsCommReadProvider;
    this.initChannelsListenersAsync();

    // next get store channels count
    this.getChannelsCountAsync();
  };

  // RESET LISTENERS
  resetChannelsListeners = () => {
    // only proceed if a read provider is attached
    if (this.state.epnsReadProvider) {
      this.state.epnsReadProvider.removeAllListeners("AddChannel");
      this.state.epnsReadProvider.removeAllListeners("UpdateChannel");
      this.state.epnsCommReadProvider.removeAllListeners("Subscribe");
      this.state.epnsCommReadProvider.removeAllListeners("Unsubscribe");
    }
  };

  // init LISTENERS
  initChannelsListenersAsync = async () => {
    // Add Listeners
    await this.listenForAddChannelAnyAsync();
    await this.listenForAddChannelSelfAsync();

    await this.listenForUpdateChannelAnyAsync();
    await this.listenForUpdateChannelSelfAsync();

    // use the communicator contract for the below
    await this.listenForSubscribeAnyAsync();
    await this.listenForSubscribeSelfAsync();
    await this.listenForUnsubscribeAnyAsync();
    await this.listenForUnsubscribeSelfAsync();
  };

  // 1. Add Any Channel Listeners
  listenForAddChannelAnyAsync = async () => {
    const contract = this.state.epnsReadProvider;
    let filter = contract.filters.AddChannel(null, null);

    contract.on(filter, async (channel, ipfs) => {
      // Do own stuff
      await this.incrementChannelsCountAsync(1);

      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.ADD_CHANNEL_ANY]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.ADD_CHANNEL_ANY]
        )) {
          if (callback) {
            callback(channel, ipfs);
          }
        }
      }
    });
  };

  // 2. Add Self Channel Listener
  listenForAddChannelSelfAsync = async () => {
    const contract = this.state.epnsReadProvider;
    let filter = contract.filters.AddChannel(this.state.account, null);

    contract.on(filter, async (channel, ipfs) => {
      // Do own stuff
      // Nothing to do, just do callback

      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.ADD_CHANNEL_SELF]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.ADD_CHANNEL_SELF]
        )) {
          if (callback) {
            callback(channel, ipfs);
          }
        }
      }
    });
  };

  // 3. Update Any Channel Listener
  listenForUpdateChannelAnyAsync = async () => {
    const contract = this.state.epnsReadProvider;
    let filter = contract.filters.UpdateChannel(null, null);

    contract.on(filter, async (channel, ipfs) => {
      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.UPDATE_CHANNEL_ANY]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.UPDATE_CHANNEL_ANY]
        )) {
          if (callback) {
            callback(channel, ipfs);
          }
        }
      }
    });
  };

  // 4. Update Self Channel Listener
  listenForUpdateChannelSelfAsync = async () => {
    const contract = this.state.epnsReadProvider;
    let filter = contract.filters.UpdateChannel(this.state.account, null);

    contract.on(filter, async (channel, ipfs) => {
      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.UPDATE_CHANNEL_SELF]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.UPDATE_CHANNEL_SELF]
        )) {
          if (callback) {
            callback(channel, ipfs);
          }
        }
      }
    });
  };

  // 5. Subscriber Any
  listenForSubscribeAnyAsync = async () => {
    const contract = this.state.epnsCommReadProvider;
    let filter = contract.filters.Subscribe(null, null);

    contract.on(filter, async (channel, user) => {
      //   // Do own stuff
      //   if (this.state.channelsMeta[channel]) {
      //     const channelID = this.state.channelsMeta[channel];
      //     let count = this.state.channelsMeta[channelID].memberCount.toNumber();
      //     count = count + 1;
      //     this.state.channelsMeta[channelID].memberCount = bigNumberify(count);
      //   }

      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.SUBSCRIBER_ANY_CHANNEL]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.SUBSCRIBER_ANY_CHANNEL]
        )) {
          if (callback) {
            callback(channel, user);
          }
        }
      }
    });
  };

  // 6. Subscriber Self
  listenForSubscribeSelfAsync = async () => {
    const contract = this.state.epnsCommReadProvider;
    let filter = contract.filters.Subscribe(this.state.account, null);

    contract.on(filter, async (channel, user) => {
      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.SUBSCRIBER_SELF_CHANNEL]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.SUBSCRIBER_SELF_CHANNEL]
        )) {
          if (callback) {
            callback(channel, user);
          }
        }
      }
    });
  };

  // 7. Unsubscribe Any
  listenForUnsubscribeAnyAsync = async () => {
    const contract = this.state.epnsCommReadProvider;
    let filter = contract.filters.Unsubscribe(null, null);

    contract.on(filter, async (channel, user) => {
      // Do own stuff
      // if (this.state.channelsMeta[channel]) {
      //   const channelID = this.state.channelsMeta[channel];
      //   let count = this.state.channelsMeta[channelID].memberCount.toNumber();
      //   count = count - 1;
      //   this.state.channelsMeta[channelID].memberCount = bigNumberify(count);
      // }

      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.UNSUBSCRIBER_ANY_CHANNEL]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.UNSUBSCRIBER_ANY_CHANNEL]
        )) {
          if (callback) {
            callback(channel, user);
          }
        }
      }
    });
  };

  // 8. Unsubscribe Self
  listenForUnsubscribeSelfAsync = async () => {
    const contract = this.state.epnsCommReadProvider;
    let filter = contract.filters.Unsubscribe(this.state.account, null);

    contract.on(filter, async (channel, user) => {
      // then perform callbacks
      if (this.state.callbacks[ChannelEvents.UNSUBSCRIBER_SELF_CHANNEL]) {
        for (let [callbackID, callback] of Object.entries(
          this.state.callbacks[ChannelEvents.UNSUBSCRIBER_SELF_CHANNEL]
        )) {
          if (callback) {
            callback(channel, user);
          }
        }
      }
    });
  };

  // FOR CALLBACKS
  addCallbacks = (callbackType, callbackID, callback) => {
    // first check if callback already exists
    if (!this.state.callbacks[callbackType]) {
      this.state.callbacks[callbackType] = {};
    }

    if (!this.state.callbacks[callbackType][callbackID]) {
      this.state.callbacks[callbackType][callbackID] = callback;
    }
  };

  removeCallbacks = (callbackType, callbackID) => {
    // first check if callback already exists
    if (this.state.callbacks[callbackType][callbackID]) {
      this.state.callbacks[callbackType][callbackID] = null;
    }
  };

  // CHANNELS COUNT
  getChannelsCountAsync = async () => {
    const enableLogs = 0;

    return new Promise(async (resolve, reject) => {
      if (this.state.channelsCount == -1) {
        // Count not set, get and set it first
        const count = EPNSCoreHelper.getTotalNumberOfChannels(
          this.state.epnsReadProvider
        )
          .then((response) => {
            this.state.channelsCount = response;

            if (enableLogs)
              console.log("getChannelsCountAsync() --> %o", response);
            resolve(this.state.channelsCount);
          })
          .catch((err) => {
            console.log("!!!Error, getChannelsCountAsync() --> %o", err);
            reject(err);
          });
      } else {
        resolve(this.state.channelsCount);
      }
    });
  };

  incrementChannelsCountAsync = async (incrementCount) => {
    return new Promise((resolve, reject) => {
      this.getChannelsCountAsync()
        .then((response) => {
          this.state.channelsCount = response + incrementCount;
          console.log(
            "incrementChannelsCountAsync() --> %d",
            this.state.channelsCount
          );
          resolve(this.state.channelsCount);
        })
        .catch((err) => {
          console.log("!!!Error, incrementChannelsCountAsync() --> %o", err);
          reject(err);
        });
    });
  };
  /**
   * Get paginated channel information
   * @param {Number} startIndex the number of channels viewed so far e.g 50
   * @param {Number} pageCount the number of items per page we want
   * @returns
   */
  getChannelFromApi = async (startIndex, pageCount, account, chainId) => {
    return postReq("/channels/_search", {
      page: Math.ceil(startIndex / pageCount) || 1,
      pageSize: pageCount,
      address: account,
      chainId: chainId,
      query: " ",
      op: "read",
    }).then((response) => {
      let output;
      output = response.data.channels.map(
        ({ alias_address, channel, memberCount, isSubscriber }) => {
          this.state.subscribersCount[channel] = memberCount;
          return {
            addr: channel,
            alias_address: alias_address,
            memberCount: memberCount,
            isSubscriber: isSubscriber,
          };
        }
      );
      return output;
    });
  };
  //Helper to get eth address of an alias when in alias network
  // getEthAddressFromAlias = async (channel) => {
  //   if (channel === null) return;
  //   const enableLogs = 0;

  //   return new Promise((resolve, reject) => {
  //     // To get channel info from a channel address
  //     postReq("/channels/getCoreAddress", {
  //       aliasAddress: channel,
  //       op: "read",
  //     })
  //       .then(({ data }) => {
  //         if (enableLogs)
  //           console.log("getEthAddressFromAlias() --> %o", data?.ethAddress);
  //         resolve(data?.ethAddress);
  //       })
  //       .catch((err) => {
  //         console.log("!!!Error, getEthAddressFromAlias() --> %o", err);
  //         reject(err);
  //       });
  //   });
  // };
  // Helper to get Channel Alias from Channel's address
  getChannelDetailsFromAddress = async (channel) => {
    if (channel === null) return;
    const enableLogs = 0;

    return new Promise((resolve, reject) => {
      // To get channel info from a channel address
      getReq(`/v1/channels/search?query=${channel}`)
        .then((response) => {
          let output;
          output = response.data.channels.map(
            ({
              alias_address,
              is_alias_verified,
            }) => {
              return {
                aliasAddress: alias_address,
                isAliasVerified: is_alias_verified,
              };
            }
          );
          if (enableLogs)
            console.log("getChannelDetailsFromAddress() --> %o", response);
          if (output.length === 0) {
            output.push({ alias_address: null, isAliasVerified: null });
          }
          resolve(output[0]);
        })
        .catch((err) => {
          console.log("!!!Error, getChannelDetailsFromAddress() --> %o", err);
          reject(err);
        });
    });
  };
  // CHANNELS META FUNCTIONS
  // To get channels meta
  // get channels meta in a paginated format
  // by passing in the starting index and the number of items per page
  getChannelsMetaAsync = async (startIndex, pageCount) => {
    this.getChannelFromApi(
      startIndex,
      pageCount,
      this.state.account,
      this.state.chainId
    );
    return new Promise(async (resolve, reject) => {
      // get total number of channels
      const channelsCount = await this.getChannelsCountAsync();
      let stopIndex = startIndex + pageCount;

      // if the stop index is -1 then get all channels
      if (stopIndex == -1 || stopIndex > channelsCount) {
        stopIndex = channelsCount;
      }

      // initialise an array with the values from 0 to the length of the number of channels
      let channelIDs = [];

      for (let i = startIndex; i < stopIndex; i++) {
        channelIDs.push(i);
      }
      console.log({ channelIDs });

      const promises = channelIDs.map(async (channelID) => {
        // Match the cache
        return this.getChannelMetaAsync(channelID)
          .then((response) => response)
          .catch((err) =>
            console.log(
              "!!!Error (but skipping), getChannelMetaAsync() --> %o",
              err
            )
          );
      });

      // wait until all promises are resolved
      const channelMetaData = await Promise.all(promises);

      // return channels meta
      // console.log("getChannelsMetaAsync(From %d to %d) --> %o", startIndex, stopIndex, channelMetaData);
      resolve(channelMetaData);
    });
  };

  // To get a single channel meta via id
  getChannelMetaAsync = async (channelID) => {
    return new Promise(async (resolve, reject) => {
      if (this.state.channelsMeta[channelID]) {
        console.log(
          "getChannelMetaAsync() [CACHED] --> %o",
          this.state.channelsMeta[channelID]
        );
        resolve(this.state.channelsMeta[channelID]);
      } else {
        let channelAddress;

        await EPNSCoreHelper.getChannelAddressFromID(
          channelID,
          this.state.epnsReadProvider
        )
          .then(async (response) => {
            channelAddress = response;
            await this.getChannelMetaViaAddressAsync(channelAddress).then(
              (response) => {
                // update the channel cache before resolving
                this.state.channelsMeta[channelID] = response;
                this.state.channelsMeta[channelAddress] = channelID;

                // resolve
                // console.log("getChannelMetaAsync() [Address: %s] --> %o", channelAddress, response);
                resolve(response);
              }
            );
          })
          .catch((err) => {
            console.log("!!!Error, getChannelMetaAsync() --> %o", err);
            reject(err);
          });
      }
    });
  };

  // To get a single channel meta via address
  getChannelMetaViaAddressAsync = async (channelAddress) => {
    return new Promise(async (resolve, reject) => {
      if (this.state.channelsMeta[channelAddress]) {
        const channelID = this.state.channelsMeta[channelAddress];

        console.log(
          "getChannelMetaViaAddressAsync() [CACHED] --> %o",
          this.state.channelsMeta[channelID]
        );
        resolve(this.state.channelsMeta[channelID]);
      } else {
        // Can't cache this :(, no way to know channel id
        await EPNSCoreHelper.getChannelInfo(
          channelAddress,
          this.state.epnsReadProvider
        )
          .then((response) => {
            // resolve
            // console.log("getChannelMetaViaAddressAsync() [Address: %s] --> %o", channelAddress, response);
            resolve(response);
          })
          .catch((err) => {
            console.log(
              "!!!Error, getChannelMetaViaAddressAsync() --> %o",
              err
            );
            reject(err);
          });
      }
    });
  };

  getChannelSubscribers = async (channelAddress) => {
    if (!channelAddress) return;
    const cachedSubscribers = this.state.subscribers[channelAddress];
    if (cachedSubscribers) {
      return cachedSubscribers;
    }
    let address = channelAddress;

    return postReq("/channels/_get_subscribers", {
      channel: address,
      blockchain: this.state.chainId,
      op: "read",
    })
      .then(({ data }) => {
        const subs = data.subscribers;
        this.state.subscribers[channelAddress] = subs;
        return subs;
      })
      .catch((err) => {
        console.log(`getChannelSubscribers => ${err.message}`);
        return [];
      });
  };

  getChannelSubscribersCount = async (channelAddress) => {
    if (!channelAddress) return;
    const cachedSubscribersCount = this.state.subscribers[channelAddress];
    if (cachedSubscribersCount) {
      return cachedSubscribersCount;
    }
    let address = channelAddress;

    return postReq("/channels/_get_subscribers", {
      channel: address,
      blockchain: this.state.chainId,
      op: "read",
    })
      .then(({ data }) => {
        const subs = data.subscribers;
        this.state.subscribersCount[channelAddress] = subs.length;
        return subs.length;
      })
      .catch((err) => {
        console.log(`getChannelSubscribersCount => ${err.message}`);
        return [];
      });
  };

  // CHANNELS INFO FUNCTIONS
  // To get a single channel meta via id
  getChannelJsonAsync = async (channelAddress) => {
    return new Promise(async (resolve, reject) => {
      if (this.state.channelsJson[channelAddress]) {
        // console.log("getChannelJsonAsync() [CACHED] --> %o", this.state.channelsJson[channelAddress]);
        resolve(this.state.channelsJson[channelAddress]);
      } else {
        try {
          // let objResponse = {};
          const getChannelJson = await EPNSCoreHelper.getChannelJsonFromChannelAddress(
            channelAddress,
            this.state.epnsReadProvider
          ).then((response) => {
            return response;
          });
          // console.log(await this.state.channelsMeta, channelAddress);
          // const getAliasAddress = EPNSCoreHelper.getAliasAddressFromChannelAddress(
          //   channelAddress, this.state.chainId
          // )
          // .then((response) => {
          //   objResponse.alias_address = response;
          // });

          // await Promise.all([getAliasAddress, getChannelJson]);

          console.log(
            "getChannelJsonAsync() [Address: %s] --> %o",
            getChannelJson
          );
          this.state.channelsJson[channelAddress] = getChannelJson;
          resolve(getChannelJson);
        } catch (err) {
          console.log("!!!Error, getChannelJsonAsync() --> %o", err);
          reject(err);
        }
      }
    });
  };
}
