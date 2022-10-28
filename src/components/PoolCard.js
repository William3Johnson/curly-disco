// React + Web3 Essentials
import { useWeb3React } from "@web3-react/core";
import React from "react";

// External Packages
import styled, { css } from "styled-components";

// Internal Compoonents
import LoaderSpinner, { LOADER_TYPE } from 'components/reusables/loaders/LoaderSpinner';
import { toast } from "react-toastify";
import InfoTooltip from "../primaries/InfoTooltip";
import { B, Button, H2, H3, Input, Item, ItemH, Span } from '../primaries/SharedStyling';

// Internal Configs
import { abis, addresses } from "config";

const ethers = require("ethers");

const bn = function (number, defaultValue = null) { if (number == null) { if (defaultValue == null) { return null } number = defaultValue } return ethers.BigNumber.from(number) }

// const tokens = function (amount) { return (bn(amount).mul(bn(10).pow(18))).toString() }
// const tokensBN = function (amount) { return (bn(amount).mul(bn(10).pow(18))) }
const bnToInt = function (bnAmount) { return bnAmount.div(bn(10).pow(18)) }

// Create Header
export default function PoolCard({
  poolName,
  poolAddress,
  tokenAddress,
  getPoolStats,
  getPUSHPoolStats,
  getUserData,
  pushPoolStats,
  userData,
}) {
  const { active, error, account, library, chainId } = useWeb3React();
  const [depositAmountToken, setDepositAmountToken] = React.useState(0);
  const [withdrawAmountToken, setWithdrawAmountToken] = React.useState(0);
  const [harvestEpochValue, setHarvestEpochValue] = React.useState(0);
  const [txInProgress, setTxInProgress] = React.useState(false);

  const [showDepositItem, setShowDepositItem] = React.useState(false);

  const [depositApproved, setDepositApprove] = React.useState(false);
  const [txInProgressApprDep, setTxInProgressApprDep] = React.useState(false);

  const [txInProgressDep, setTxInProgressDep] = React.useState(false);
  const [showDepSlip, setShowDepSlip] = React.useState(null);

  const [txInProgressWithdraw, setTxInProgressWithdraw] = React.useState(false);

  const [txInProgressMassHarvest, setTxInProgressMassHarvest] = React.useState(false);

  React.useEffect(() => {
    // Check if the account has approved deposit
    checkApprDeposit();

  }, [depositAmountToken]);

  const checkApprDeposit = async () => {
    if (depositAmountToken <= 0) {
      setDepositApprove(false);
      return;
    }
    setTxInProgressApprDep(true);

    var signer = library.getSigner(account);
    const tokenAddr = poolName == "Uniswap LP Pool (UNI-V2)" ? addresses.epnsLPToken : addresses.epnsToken;
    let token = new ethers.Contract(tokenAddr, abis.epnsToken, signer);

    const allowance = await token.allowance(account, addresses.staking);
    if (allowance.gte(bn(depositAmountToken))) {
      setDepositApprove(true);
    }
    else {
      setDepositApprove(false);
    }

    setTxInProgressApprDep(false);
  }

  const fillMax = async () => {
    var signer = library.getSigner(account);
    const tokenAddr = poolName == "Uniswap LP Pool (UNI-V2)" ? addresses.epnsLPToken : addresses.epnsToken;
    let token = new ethers.Contract(tokenAddr, abis.epnsToken, signer);

    let balance = bnToInt(await token.balanceOf(account));
    setDepositAmountToken(parseInt(balance.toString().replace(/\D/, '')) || 0)
  }

  const approveDeposit = async () => {
    if (depositApproved || txInProgressApprDep) {
      return
    }

    setTxInProgressApprDep(true);

    var signer = library.getSigner(account);
    let epnsToken = new ethers.Contract(tokenAddress, abis.epnsToken, signer);
    let staking = new ethers.Contract(addresses.staking, abis.staking, signer);

    const uintMax = bn(2).pow(bn(256)).sub(1)

    const tx = epnsToken.approve(
      staking.address,
      uintMax
    );

    tx.then(async (tx) => {
      let txToast = toast.dark(
        <LoaderToast msg="Waiting for Confirmation..." color="#35c5f3" />,
        {
          position: "bottom-right",
          autoClose: false,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );

      try {
        await library.waitForTransaction(tx.hash);

        toast.update(txToast, {
          render: "Transaction Completed!",
          type: toast.TYPE.SUCCESS,
          autoClose: 5000,
        });
        setTxInProgressApprDep(false);
        setDepositApprove(true);

      } catch (e) {
        toast.update(txToast, {
          render: "Transaction Failed! (" + e.name + ")",
          type: toast.TYPE.ERROR,
          autoClose: 5000,
        });

        setTxInProgressApprDep(false);
      }
    }).catch((err) => {
      toast.dark("Transaction Cancelled!", {
        position: "bottom-right",
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      setTxInProgressApprDep(false);
    });
  }

  const depositAmountTokenFarmSingleTx = async () => {
    if (txInProgressDep || !approveDeposit) {
      return
    }

    setTxInProgressDep(true)

    var signer = library.getSigner(account);
    let epnsToken = new ethers.Contract(tokenAddress, abis.epnsToken, signer);
    let staking = new ethers.Contract(addresses.staking, abis.staking, signer);
    console.log(depositAmountToken);

    const tx2 = staking.deposit(
      tokenAddress,
      ethers.BigNumber.from(depositAmountToken).mul(
        ethers.BigNumber.from(10).pow(18)
      )
    );

    tx2
      .then(async (tx) => {
        let txToast = toast.dark(
          <LoaderToast msg="Waiting for Confirmation..." color="#35c5f3" />,
          {
            position: "bottom-right",
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          }
        );

        try {
          await library.waitForTransaction(tx.hash);

          toast.update(txToast, {
            render: "Transaction Completed!",
            type: toast.TYPE.SUCCESS,
            autoClose: 5000,
          });

          getPoolStats();
          getPUSHPoolStats(pushPoolStats);
          getUserData();

          setTxInProgressDep(false);
          setShowDepSlip(true);
          // window.location.reload();
        } catch (e) {
          toast.update(txToast, {
            render: "Transaction Failed! (" + e.name + ")",
            type: toast.TYPE.ERROR,
            autoClose: 5000,
          });

          setTxInProgressDep(false);
        }
      })
      .catch((err) => {
        toast.dark("Transaction Cancelled!", {
          position: "bottom-right",
          type: toast.TYPE.ERROR,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });

        setTxInProgressDep(false);
      });
  };

  const withdrawAmountTokenFarmAutomatic = async () => {
    if (txInProgressWithdraw) {
      return;
    }

    setTxInProgressWithdraw(true);
    const withdrawAmount = formatTokens(userData.epochStakeNext);

    if (withdrawAmount == 0) {
      toast.dark("Nothing to Withdraw!", {
        position: "bottom-right",
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      setTxInProgressWithdraw(false);
      return;
    }

    var signer = library.getSigner(account);
    let staking = new ethers.Contract(addresses.staking, abis.staking, signer);

    const tx = staking.withdraw(
      tokenAddress,
      ethers.BigNumber.from(withdrawAmount).mul(
        ethers.BigNumber.from(10).pow(18)
      )
    );

    tx.then(async (tx) => {
      let txToast = toast.dark(
        <LoaderToast msg="Waiting for Confirmation..." color="#35c5f3" />,
        {
          position: "bottom-right",
          autoClose: false,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );

      try {
        await library.waitForTransaction(tx.hash);

        toast.update(txToast, {
          render: "Transaction Completed!",
          type: toast.TYPE.SUCCESS,
          autoClose: 5000,
        });

        setTxInProgressWithdraw(false);

        getPoolStats();
        getPUSHPoolStats(pushPoolStats);
        getUserData();
      } catch (e) {
        toast.update(txToast, {
          render: "Transaction Failed! (" + e.name + ")",
          type: toast.TYPE.ERROR,
          autoClose: 5000,
        });

        setTxInProgressWithdraw(false);
      }
    }).catch((err) => {
      toast.dark("Transaction Cancelled!", {
        position: "bottom-right",
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      setTxInProgressWithdraw(false);
    });
  };

  const harvestTokens = async () => {
    var signer = library.getSigner(account);
    let yieldFarmingPUSH = new ethers.Contract(
      poolAddress,
      abis.yieldFarming,
      signer
    );

    if (harvestEpochValue) {
      const tx = yieldFarmingPUSH.harvest(harvestEpochValue);
      tx.then(async (tx) => {
        let txToast = toast.dark(
          <LoaderToast msg="Waiting for Confirmation..." color="#35c5f3" />,
          {
            position: "bottom-right",
            autoClose: false,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
          }
        );

        try {
          await library.waitForTransaction(tx.hash);

          toast.update(txToast, {
            render: "Transaction Completed!",
            type: toast.TYPE.SUCCESS,
            autoClose: 5000,
          });

          setTxInProgress(false);
        } catch (e) {
          toast.update(txToast, {
            render: "Transaction Failed! (" + e.name + ")",
            type: toast.TYPE.ERROR,
            autoClose: 5000,
          });

          setTxInProgress(false);
        }
      }).catch((err) => {
        toast.dark("Transaction Cancelled!", {
          position: "bottom-right",
          type: toast.TYPE.ERROR,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });

        setTxInProgress(false);
      });
    }
  };

  const massHarvestTokensAll = async () => {
    if (txInProgressMassHarvest) {
      return;
    }

    if (!pushPoolStats.currentEpochPUSH || pushPoolStats.currentEpochPUSH == 1) {
      toast.dark("Harvest unlocks from Epoch 2!", {
        position: "bottom-right",
        type: toast.TYPE.ERROR,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      return;
    }
    setTxInProgressMassHarvest(true);

    console.log(poolAddress);

    var signer = library.getSigner(account);
    let yieldFarmingPUSH = new ethers.Contract(
      poolAddress,
      abis.yieldFarming,
      signer
    );
    const tx = yieldFarmingPUSH.massHarvest();


    tx.then(async (tx) => {
      let txToast = toast.dark(
        <LoaderToast msg="Waiting for Confirmation..." color="#35c5f3" />,
        {
          position: "bottom-right",
          autoClose: false,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        }
      );

      try {
        await library.waitForTransaction(tx.hash);

        toast.update(txToast, {
          render: "Transaction Completed!",
          type: toast.TYPE.SUCCESS,
          autoClose: 5000,
        });

        setTxInProgressMassHarvest(false);
      } catch (e) {
        toast.update(txToast, {
          render: "Transaction Failed! (" + e.name + ")",
          type: toast.TYPE.ERROR,
          autoClose: 5000,
        });

        setTxInProgressMassHarvest(false);
      }
    }).catch((err) => {
      toast.dark("Transaction Cancelled!", {
        position: "bottom-right",
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });

      setTxInProgressMassHarvest(false);
    });
  };

  const formatTokens = (tokens) => {
    if (tokens) {
      return tokens.div(ethers.BigNumber.from(10).pow(18)).toString();
    }
  };

  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return (
    <>
      <Item margin="20px" align="stretch" self="stretch" border="1px solid #e1e1e1" radius="12px">
        <Item>
          <Item>
            <H2 textTransform="uppercase" spacing="0.1em">
              <Span bg={poolName == "Uniswap LP Pool (UNI-V2)" ? "#35c5f3" : "#e20880"} size="0.8em" color="#fff" weight="600" padding="0px 8px">{poolName}</Span>
            </H2>
            <Item
              align="flex-end"
              self="stretch"
            >
              <H3>
                <Span>Current APR </Span><Span bg={poolName == "Uniswap LP Pool (UNI-V2)" ? "#35c5f3" : "#e20880"} padding="2px 8px" weight="600" color="#fff"><b>{pushPoolStats.stakingAPR}%</b></Span>
              </H3>
            </Item>
          </Item>

          <ItemH margin="10px 0px 0px 0px" self="stretch" items="stretch" bg="#f1f1f1">
            <PoolContainer bg="#fff" margin="5px 15px" radius="12px" border="1px solid #ddd" borderBottom="8px solid #e1e1e1">
              <PoolBoxTitle margin="15px 10px" fg="#999" textTransform="uppercase" size="10px" spacing="0.2em">Current Reward</PoolBoxTitle>
              <PoolBoxMsg
                bg="transparent"
                fg={poolName == "Uniswap LP Pool (UNI-V2)" ? "#35c5f3" : "#e20880"}
                size="16px"
                margin="-15px 5px 10px 5px"
              >
                {numberWithCommas(formatTokens(pushPoolStats.rewardForCurrentEpoch))} PUSH
              </PoolBoxMsg>
            </PoolContainer>

            <PoolContainer bg="#fff" margin="5px 15px" radius="12px" border="1px solid #ddd" borderBottom="8px solid #e1e1e1">
              <PoolBoxTitle margin="15px 10px" fg="#999" textTransform="uppercase" size="10px" spacing="0.2em">Total Staked</PoolBoxTitle>
              <PoolBoxMsg
                bg="transparent"
                fg={poolName == "Uniswap LP Pool (UNI-V2)" ? "#35c5f3" : "#e20880"}
                size="16px"
                margin="-15px 5px 10px 5px"
              >
                {numberWithCommas(formatTokens(pushPoolStats.poolBalance))} {poolName == "Uniswap LP Pool (UNI-V2)" ? "UNI-V2" : "PUSH"}
              </PoolBoxMsg>
            </PoolContainer>
          </ItemH>

          <Item
            self="stretch"
            align="flex-end"
            margin="0px 0px 10px 0px"
          >
            <EpochDisplayer>
              <Span padding="0px 5px 0px 0px">Current Epoch</Span><B>{pushPoolStats.currentEpochPUSH.toString()}/{pushPoolStats.totalEpochPUSH}</B>
            </EpochDisplayer>
          </Item>
        </Item>

        <Item padding="10px 20px 0px 20px" align="stretch" self="stretch">
          <ItemH margin="0px" align="stretch" self="stretch" flex="1">
            <Item bg="#000" margin="5px 10px" radius="12px" flex="1">
              <PoolBoxTitle>User Deposit</PoolBoxTitle>
              <PoolBoxMsg>{formatTokens(userData.epochStakeNext)} {poolName == "Uniswap LP Pool (UNI-V2)" ? "UNI-V2" : "PUSH"}</PoolBoxMsg>
            </Item>

            <Item bg="#000" margin="5px 10px" radius="12px" flex="1">
              <PoolBoxTitle>Rewards Claimed <InfoTooltip title={"The total rewards you have already claimed from the pool. This includes all the rewards including the ones already harvested."} /></PoolBoxTitle>
              <PoolBoxMsg>{(userData.totalAccumulatedReward - userData.totalAvailableReward).toFixed(2)} PUSH</PoolBoxMsg>
            </Item>
          </ItemH>

          <ItemH margin="0px" align="stretch" self="stretch" flex="1">
            <Item bg="#000" margin="5px 10px" radius="12px" flex="1">
              <PoolBoxTitle>Current Epoch Reward <InfoTooltip title={"This is only an estimation for the user's reward that they might get after the epoch. This might change depending upon deposits from other users."} /></PoolBoxTitle>
              <PoolBoxMsg>{userData.potentialUserReward} PUSH</PoolBoxMsg>
            </Item>

            <Item bg="#000" margin="5px 10px" radius="12px" flex="1">
              <PoolBoxTitle>Available for Harvest <InfoTooltip title={"The rewards that are currently available for harvesting and can be immediately transferred to your address."} /></PoolBoxTitle>
              <PoolBoxMsg>{userData.totalAvailableReward} PUSH</PoolBoxMsg>
            </Item>
          </ItemH>
        </Item>

        {showDepositItem &&
          <Item bg="#f1f1f1" radius="0px" margin="20px 0px -10px 0px" padding="10px 20px" align="stretch" self="stretch">

            {!showDepSlip &&
              <>
                <Item>
                  <MaxButton
                    bg="#000"
                    onClick={fillMax}
                    position="absolute"
                  >
                    Max
                  </MaxButton>

                  <Input
                    placeholder="Number of Tokens"
                    radius="4px"
                    padding="12px"
                    self="stretch"
                    bg="#fff"
                    value={depositAmountToken}
                    onChange={(e) => {
                      setDepositAmountToken(parseInt(e.target.value.replace(/\D/, '')) || 0)
                    }}
                  />
                </Item>

                <ItemH padding="10px 0 0 0">
                  <ButtonAlt
                    bg={depositApproved ? "#999" : "#e20880"}
                    onClick={approveDeposit}
                    disabled={depositApproved ? true : false}
                  >
                    {!depositApproved && !txInProgressApprDep &&
                      <Span color="#fff" weight="400">Approve</Span>
                    }
                    {txInProgressApprDep && !depositApproved &&
                      <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#fff" />
                    }
                    {!txInProgress && depositApproved &&
                      <Span color="#fff" weight="600">Approved</Span>
                    }
                  </ButtonAlt>
                  <ButtonAlt
                    bg={!depositApproved ? "#999" : "#e20880"}
                    disabled={!depositApproved ? true : false}
                    onClick={depositAmountTokenFarmSingleTx}
                  >
                    {!txInProgressDep &&
                      <Span color="#fff" weight="400">Deposit</Span>
                    }
                    {txInProgressDep &&
                      <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#fff" />
                    }
                  </ButtonAlt>
                </ItemH>
              </>
            }

            {showDepSlip &&
              <Span
                bg="#e20880"
                color="#fff"
                align="center"
                textTransform="uppercase"
                spacing="0.1em"
                size="14px"
                weight="600"
                padding="10px"
                self="stretch"
              >
                Deposit Successful!
              </Span>
            }

          </Item>
        }

        <ItemH padding="0px 20px 0px 20px" margin="20px 0px 20px 0px" align="center" self="stretch">
          {!showDepositItem &&
            <ButtonAlt
              bg="#e20880"
              onClick={() => setShowDepositItem(!showDepositItem)}
            >
              {!txInProgressDep &&
                <Span color="#fff" weight="400">Deposit</Span>
              }
              {txInProgressApprDep &&
                <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#fff" />
              }
            </ButtonAlt>
          }

          <ButtonAlt
            bg="#000"
            onClick={() => withdrawAmountTokenFarmAutomatic()}
          >
            {!txInProgressWithdraw &&
              <Span color="#fff" weight="400">Withdraw</Span>
            }
            {txInProgressWithdraw &&
              <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#fff" />
            }
          </ButtonAlt>

          <ButtonAlt
            bg="#000"
            onClick={() => massHarvestTokensAll()}
          >
            {!txInProgressMassHarvest &&
              <Span color="#fff" weight="400">Harvest</Span>
            }
            {txInProgressMassHarvest &&
              <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#fff" />
            }
          </ButtonAlt>
        </ItemH>
      </Item>
    </>
  );
}

// toast customize
const LoaderToast = ({ msg, color }) => (
  <Toaster>
    <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={30} spinnerColor={color} />
    <ToasterMsg>{msg}</ToasterMsg>
  </Toaster>
);


const MaxButton = styled(Button)`
  position: absolute;
  right: 0;
  padding: 4px 8px;
  margin: 5px;
  border-radius: 4px;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.1em;
`

const PoolContainer = styled(Item)`
  border-bottom: ${props => props.borderBottom || "none"};
`

const PoolBoxTitle = styled(Span)`
  background: ${props => props.bg || 'transparent'};
  color: ${props => props.fg || '#fff'};
  font-weight: 600;
  font-size: ${props => props.size || '12px'};
  margin: ${props => props.margin || '10px 5px'};
  letter-spacing: 0.1em;
`

const PoolBoxMsg = styled(Span)`
  background: ${props => props.bg || '#fff'};
  color: ${props => props.fg || '#000'};
  font-weight: 600;
  font-size: ${props => props.size || '12px'};
  margin: ${props => props.margin || '5px 5px 10px 5px'};
  letter-spacing: 0.1em;
  padding: 4px 15px;
  border-radius: 10px;
`

const Container = styled.div`
  padding: 18px;
  background: #fff;
  flex: 1;

  box-shadow: 0px 15px 20px -5px rgba(0, 0, 0, 0.1);
  border-radius: 15px;
  border: 1px solid rgb(225, 225, 225);

  margin: 10px;

  &:hover {
    opacity: 0.9;
  }
`;

const MainTitle = styled.h2`
  text-transform: uppercase;
`;

const Heading = styled.h5`
  font-weight: 600;
  color: #e20880;
  text-transform: uppercase;
`;

const EpochDisplayer = styled(Span)`
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 12px;
  background: #f1f1f1;
  padding: 0px 10px 0px 10px;
  position: relative;
  height: 23px;
  align-items: center;
  text-align: center;
  display: flex;

  &:after {
    width: 0;
    height: 0;
    border-top: 0px solid transparent;
    border-bottom: 25px solid transparent;
    border-right: 10px solid #f1f1f1;
    left: -10px;
    content: '';
    position: absolute;
  }
`

const ButtonAlt = styled(Button)`
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

const Toaster = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0px 10px;
`;

const ToasterMsg = styled.div`
  margin: 0px 10px;
`;
