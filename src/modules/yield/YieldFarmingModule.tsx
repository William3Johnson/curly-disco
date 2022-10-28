// React + Web3 Essentials
import { useWeb3React } from '@web3-react/core';
import React, { useState } from 'react';

// External Packages
import styled, { useTheme } from 'styled-components';

// Internal Compoonents
import PoolCard from 'components/PoolCard';
import LoaderSpinner, { LOADER_TYPE } from 'components/reusables/loaders/LoaderSpinner';
import YieldFarmingDataStore from 'singletons/YieldFarmingDataStore';
import { Content, Item, ItemH, Section, Span } from '../../primaries/SharedStyling';

// Internal Configs
import { abis, addresses, appConfig } from 'config';
import GLOBALS, { device, globalsMargin } from 'config/Globals';

const ethers = require('ethers');

// Create Header
function YieldFarmingModule() {
  const { account, library, chainId } = useWeb3React();
  const onCoreNetwork = chainId === appConfig.coreContractChain;

  const themes = useTheme();

  const [poolStats, setPoolStats] = React.useState(null);
  const [pushPoolStats, setPushPoolStats] = React.useState(null);
  const [lpPoolStats, setLpPoolStats] = React.useState(null);
  const [userDataPUSH, setUserDataPUSH] = React.useState(null);
  const [userDataLP, setUserDataLP] = React.useState(null);

  const [formattedDuration, setFormattedDuration] = React.useState('');

  const [epnsToken, setEpnsToken] = React.useState(null);
  const [staking, setStaking] = React.useState(null);
  const [yieldFarmingPUSH, setYieldFarmingPUSH] = React.useState(null);
  const [yieldFarmingLP, setYieldFarmingLP] = React.useState(null);
  const [uniswapV2Router02, setUniswapV2Router02] = React.useState(null);

  React.useEffect(() => {
    if (!onCoreNetwork) {
      const url = window.location.origin;
      window.location.replace(`${url}/#/notavailable`);
    }
  });

  const getPoolStats = React.useCallback(async () => {
    const poolStats = await YieldFarmingDataStore.instance.getPoolStats();

    setPoolStats({ ...poolStats });
  }, [epnsToken, staking, yieldFarmingPUSH, yieldFarmingLP, uniswapV2Router02]);

  const getPUSHPoolStats = React.useCallback(async () => {
    const pushPoolStats = await YieldFarmingDataStore.instance.getPUSHPoolStats();

    setPushPoolStats({ ...pushPoolStats });
  }, [epnsToken, staking, yieldFarmingPUSH, yieldFarmingLP, uniswapV2Router02]);

  const getLPPoolStats = React.useCallback(
    async (poolStats) => {
      const lpPoolStats = await YieldFarmingDataStore.instance.getLPPoolStats(poolStats);

      setLpPoolStats({ ...lpPoolStats });
    },
    [epnsToken, staking, yieldFarmingPUSH, yieldFarmingLP, uniswapV2Router02]
  );

  const getUserDataPUSH = React.useCallback(async () => {
    const userDataPUSH = await YieldFarmingDataStore.instance.getUserData(yieldFarmingPUSH);

    setUserDataPUSH({ ...userDataPUSH });
  }, [yieldFarmingPUSH]);

  const getUserDataLP = React.useCallback(async () => {
    const userDataLP = await YieldFarmingDataStore.instance.getUserData(yieldFarmingLP);

    setUserDataLP({ ...userDataLP });
  }, [yieldFarmingLP]);

  const formatTokens = (tokens) => {
    if (tokens) {
      return tokens.div(ethers.BigNumber.from(10).pow(18)).toString();
    }
  };

  const getFormattedDuration = () => {
    if (poolStats?.epochEndTimestamp) {
      const epochEndTimestamp = poolStats.epochEndTimestamp.toNumber();

      const duration = epochEndTimestamp - Math.floor(new Date() / 1000);

      if (duration < 0) {
        getPoolStats();
      }

      const day = parseInt(duration / 86400);
      const hour = parseInt((duration - day * 86400) / 3600);

      const minutes = parseInt((duration - (day * 86400 + hour * 3600)) / 60);
      const seconds = duration - (day * 86400 + hour * 3600 + minutes * 60);

      setFormattedDuration(`${day}D ${hour}H ${minutes}M ${seconds}S`);
    }
  };

  React.useEffect(() => {
    setTimeout(() => {
      getFormattedDuration();
    }, 1000);
  });

  React.useEffect(() => {
    let epnsToken = new ethers.Contract(addresses.epnsToken, abis.epnsToken, library);

    let staking = new ethers.Contract(addresses.staking, abis.staking, library);
    let yieldFarmingPUSH = new ethers.Contract(addresses.yieldFarmPUSH, abis.yieldFarming, library);

    let yieldFarmingLP = new ethers.Contract(addresses.yieldFarmLP, abis.yieldFarming, library);

    let uniswapV2Router02Instance = new ethers.Contract(addresses.uniswapV2Router02, abis.uniswapV2Router02, library);

    setEpnsToken(epnsToken);
    setStaking(staking);
    setYieldFarmingPUSH(yieldFarmingPUSH);
    setYieldFarmingLP(yieldFarmingLP);
    setUniswapV2Router02(uniswapV2Router02Instance);

    if (!!(library && account)) {
      var signer = library.getSigner(account);

      let epnsToken = new ethers.Contract(addresses.epnsToken, abis.epnsToken, signer);
      let staking = new ethers.Contract(addresses.staking, abis.staking, signer);
      let yieldFarmingPUSH = new ethers.Contract(addresses.yieldFarmPUSH, abis.yieldFarming, signer);
      let yieldFarmingLP = new ethers.Contract(addresses.yieldFarmLP, abis.yieldFarming, signer);

      let uniswapV2Router02Instance = new ethers.Contract(addresses.uniswapV2Router02, abis.uniswapV2Router02, signer);

      setEpnsToken(epnsToken);
      setStaking(staking);
      setYieldFarmingPUSH(yieldFarmingPUSH);
      setYieldFarmingLP(yieldFarmingLP);
      setUniswapV2Router02(uniswapV2Router02Instance);
    }
  }, [account]);

  React.useEffect(() => {
    if (epnsToken != null && staking != null && yieldFarmingPUSH != null) {
      // Instantiate Data Stores
      YieldFarmingDataStore.instance.init(
        account,
        epnsToken,
        staking,
        yieldFarmingPUSH,
        yieldFarmingLP,
        uniswapV2Router02
      );

      getPoolStats();

      // setpoolStats(YieldFarmingDataStore.instance.state);
    }
  }, [getPoolStats]);

  React.useEffect(() => {
    if (poolStats) {
      syncData(poolStats);
    }
  }, [poolStats]);

  const syncData = async (poolStats) => {
    getPUSHPoolStats();
    getLPPoolStats(poolStats);

    getUserDataPUSH();
    getUserDataLP();
  };

  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return (
    <Container>
      <Section>
        {poolStats ? (
          <>
            <Content themes={themes.yieldBg}>
              <ItemH margin="0px 15px 0px 15px" align="stretch">
                <StatsCard bg={themes.mainBg}>
                  <StatsHeading bg="#e20880">Total Value Locked</StatsHeading>
                  <StatsContent>
                    <StatsInnerTitle>{`$ ${numberWithCommas(poolStats.totalValueLocked.toFixed(2))}`}</StatsInnerTitle>
                  </StatsContent>
                  <StatsPreview color="#e20880">TVL</StatsPreview>
                </StatsCard>

                <StatsCard bg={themes.mainBg}>
                  <StatsHeading bg="#35c5f3">PUSH Rewards Given</StatsHeading>
                  <StatsContent>
                    <StatsInnerTitle>
                      {numberWithCommas(formatTokens(poolStats.pushRewardsDistributed))}
                    </StatsInnerTitle>
                    <StatsInnerSub>
                      out of {numberWithCommas(formatTokens(poolStats.totalDistributedAmount))}
                    </StatsInnerSub>
                  </StatsContent>
                  <StatsPreview color="#35c5f3">Rewarded</StatsPreview>
                </StatsCard>

                <StatsCard bg={themes.mainBg}>
                  <StatsHeading bg="#674c9f">Time Left</StatsHeading>
                  <StatsContent>
                    <StatsInnerTitle>{formattedDuration}</StatsInnerTitle>
                    <StatsInnerSub>until next epoch</StatsInnerSub>
                  </StatsContent>
                  <StatsPreview color="#674c9f">time left</StatsPreview>
                </StatsCard>

                <StatsCard bg={themes.mainBg}>
                  <StatsHeading bg={themes.pushPriceBg}>PUSH Price</StatsHeading>
                  <StatsContent>
                    <StatsInnerTitle>{`$ ${poolStats.pushPrice.toFixed(2)}`}</StatsInnerTitle>
                    <StatsInnerSub>
                      <a target="_blank" href={`https://app.uniswap.org/#/swap?inputCurrency=${addresses.epnsToken}`}>
                        Uniswap
                      </a>
                    </StatsInnerSub>
                  </StatsContent>
                  <StatsPreview color="#000">UNISWAP</StatsPreview>
                </StatsCard>
              </ItemH>
            </Content>

            {!(lpPoolStats && userDataLP) && !(pushPoolStats && userDataPUSH) ? (
              <Item padding="20px">
                <LoaderSpinner type={LOADER_TYPE.SEAMLESS} />
              </Item>
            ) : (
              <Content padding="25px 0px">
                <ItemH margin="0px 10px 0px 10px" align="stretch">
                  {lpPoolStats && userDataLP ? (
                    <PoolCard
                      poolName={'Uniswap LP Pool (UNI-V2)'}
                      poolAddress={addresses.yieldFarmLP}
                      tokenAddress={addresses.epnsLPToken}
                      getPoolStats={getPoolStats}
                      getPUSHPoolStats={getLPPoolStats}
                      getUserData={getUserDataLP}
                      pushPoolStats={lpPoolStats}
                      userData={userDataLP}
                    />
                  ) : null}
                  {pushPoolStats && userDataPUSH ? (
                    <PoolCard
                      poolName={'Staking Pool (PUSH)'}
                      poolAddress={addresses.yieldFarmPUSH}
                      tokenAddress={addresses.epnsToken}
                      getPoolStats={getPoolStats}
                      getPUSHPoolStats={getPUSHPoolStats}
                      getUserData={getUserDataPUSH}
                      pushPoolStats={pushPoolStats}
                      userData={userDataPUSH}
                    />
                  ) : null}
                </ItemH>
              </Content>
            )}
          </>
        ) : (
          <Item padding="20px">
            <LoaderSpinner type={LOADER_TYPE.SEAMLESS} />
          </Item>
        )}
      </Section>
    </Container>
  );
}

// css styles
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
  width: calc(
    100% - ${globalsMargin.MINI_MODULES.DESKTOP.RIGHT} - ${globalsMargin.MINI_MODULES.DESKTOP.LEFT} -
      ${GLOBALS.ADJUSTMENTS.PADDING.BIG} - ${GLOBALS.ADJUSTMENTS.PADDING.BIG}
  );
  padding: ${GLOBALS.ADJUSTMENTS.PADDING.BIG};
  position: relative;
  margin: ${GLOBALS.ADJUSTMENTS.MARGIN.MINI_MODULES.DESKTOP};

  @media ${device.laptop} {
    margin: ${GLOBALS.ADJUSTMENTS.MARGIN.MINI_MODULES.TABLET};
    padding: ${GLOBALS.ADJUSTMENTS.PADDING.DEFAULT};
    width: calc(
      100% - ${globalsMargin.MINI_MODULES.TABLET.RIGHT} - ${globalsMargin.MINI_MODULES.TABLET.LEFT} -
        ${GLOBALS.ADJUSTMENTS.PADDING.DEFAULT} - ${GLOBALS.ADJUSTMENTS.PADDING.DEFAULT}
    );
  }

  @media ${device.mobileM} {
    margin: ${GLOBALS.ADJUSTMENTS.MARGIN.MINI_MODULES.MOBILE};
    padding: ${GLOBALS.ADJUSTMENTS.PADDING.DEFAULT};
    width: calc(
      100% - ${globalsMargin.MINI_MODULES.MOBILE.RIGHT} - ${globalsMargin.MINI_MODULES.MOBILE.LEFT} -
        ${GLOBALS.ADJUSTMENTS.PADDING.DEFAULT} - ${GLOBALS.ADJUSTMENTS.PADDING.DEFAULT}
    );
  }
`;

const StatsCard = styled(Item)`
  overflow: hidden;
  min-width: 180px;

  border-radius: 12px;
  border: 1px solid rgb(225, 225, 225);

  margin: 0px 15px;

  &:hover {
    opacity: 0.9;
  }
`;

const CenterHeading = styled.h2`
  text-align: center;
`;

const PoolContainer = styled.div`
  display: flex;
`;

const StatsHeading = styled(Item)`
  flex: 0;
  align-self: stretch;
  color: #fff;
  top: 0px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 15px;
  text-align: center;
  padding: 10px 5px;
  right: 0;
  left: 0;
`;

const StatsContent = styled(Item)`
  padding: 20px 20px;
`;

const StatsPreview = styled(Span)`
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-weight: 600;
  font-size: 12px;
  opacity: 0.25;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${(props) => props.color || '#000'};
  z-index: -1;
`;

const StatsInnerTitle = styled.span`
  font-weight: bold;
  font-size: 22px;
  letter-spacing: 0.1em;
`;

const StatsInnerSub = styled.span`
  font-size: 12px;
  color: #999;
  font-weight: 600;
  align-self: flex-end;
`;

// Export Default
export default YieldFarmingModule;
