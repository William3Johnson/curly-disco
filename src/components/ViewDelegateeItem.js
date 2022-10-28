// React + Web3 Essentials
import { useWeb3React } from '@web3-react/core';
import React from "react";

// External Packages
import Skeleton from '@yisheng90/react-loading';
import { FiTwitter } from 'react-icons/fi';
import { GoVerified } from 'react-icons/go';
import { IoMdShareAlt } from 'react-icons/io';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';
import styled, { css } from 'styled-components';
import Web3 from 'web3';

// Internal Compoonents
import LoaderSpinner, { LOADER_TYPE } from 'components/reusables/loaders/LoaderSpinner';
import EPNSCoreHelper from "helpers/EPNSCoreHelper";
import Blockies from "primaries/BlockiesIdenticon";
import { toolingPostReq } from "../api/index";
import { createTransactionObject } from '../helpers/GaslessHelper';
import { executeDelegateTx } from '../helpers/WithGasHelper';
import { Anchor, Image, Item, ItemBreak, ItemH, Span } from '../primaries/SharedStyling';

// Internal Configs
import { abis, addresses } from "config";

export const PUSH_BALANCE_TRESHOLD = 100; //minimum number of push
export const GAS_LIMIT = 50; //dollars limit of gas;
export const ERROR_TOAST_DEFAULTS = {
  type: toast.TYPE.ERROR,
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined
};


function ViewDelegateeItem({ delegateeObject, epnsToken, signerObject, pushBalance,setGaslessInfo, theme }) {
  const { account, library } = useWeb3React();
  const [loading, setLoading] = React.useState(true);
  const [txLoading, setTxLoading] = React.useState(false);
  const [txInProgress, setTxInProgress] = React.useState(false);
  const [isBalance, setIsBalance] = React.useState(false);
  const [transactionMode,setTransactionMode] = React.useState('gasless');

  const provider = new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/4ff53a5254144d988a8318210b56f47a');
  var web3 = new Web3(provider);
  var ens = web3.eth.ens;

  React.useEffect(() => {
    setLoading(false);
    if (pushBalance !== 0) {
      setIsBalance(true)
    }
  }, [account, delegateeObject]);

  const checkForDelegateError = async(gasEstimate) => {
    // return false if no error
    // otherwise return error message
    // get gas price
    const gasPrice = await EPNSCoreHelper.getGasPriceInDollars(library);
    const totalCost = gasPrice * gasEstimate;
    if(totalCost > GAS_LIMIT){
      return "Gas Price is too high, Please try again in a while." 
    }
    return false
  }

  //execute delegate tx wth gas when tokenbalance < PUSH_BALANCE_TRESHOLD
 

  const delegateAction = async (delegateeAddress) => {
    if(txInProgress) return;
    setTxInProgress(true);
    // if (!isBalance) {
    //   toast.dark("No PUSH to Delegate!", {
    //     position: "bottom-right",
    //     ...ERROR_TOAST_DEFAULTS
    //   });
    //   return;
    // }
 
    setTxLoading(true);
    if(transactionMode === 'withgas'){
     await executeDelegateTx(delegateeAddress,epnsToken,toast,setTxLoading,library,LoaderToast);
     setTxInProgress(false); 
     return;
    }
    if (pushBalance < PUSH_BALANCE_TRESHOLD) {
      // await  executeDelegateTx(delegateeAddress,epnsToken,toast,setTxLoading,library,LoaderToast)
      toast.dark("Atleast " + PUSH_BALANCE_TRESHOLD +" PUSH required for gasless delegation!", {
        position: "bottom-right",
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      setTxLoading(false);
      setTxInProgress(false);
      return;
    }
    if(!web3.utils.isAddress(delegateeAddress))
    delegateeAddress = await ens.getAddress(delegateeAddress);
    await createTransactionObject(delegateeAddress,account,epnsToken,addresses,signerObject,library,setTxLoading);
    setTxInProgress(false);
    toolingPostReq('/gov/prev_delegation',{"walletAddress": account}).then(res=>{
      console.log("result",res.data.user)
      setGaslessInfo(res.data.user);
      // toast.dark("Successfully Fetched Prev Delegation Data", {
      //   position: "bottom-right",
      //   type: toast.TYPE.SUCCESS,
      //   autoClose: 5000,
      //   hideProgressBar: false,
      //   closeOnClick: true,
      //   pauseOnHover: true,
      //   draggable: true,
      //   progress: undefined,
      // });
    }
    ).catch(e=>{
      setTxInProgress(false);
      toast.dark(e, {
        position: "bottom-right",
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
    }).finally(()=>{
      setTxInProgress(false);

    })
  }

  // toast customize
  const LoaderToast = ({ msg, color }) => (
    <Toaster>
      <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={30} />
      <ToasterMsg>{msg}</ToasterMsg>
    </Toaster>
  )

  // render
  return (
    <Item
      key={delegateeObject.wallet}
    >
      <DelegateeItem
        theme={theme}
      >
        <DelegateeImageOuter>
          <DelegateeImageInner>
            {loading &&
              <Skeleton color="#eee" width="100%" height="100%" />
            }

            {!loading && delegateeObject.pic &&
              
              <Image
                src={require(`../assets/gov/delegatees/${delegateeObject.pic}.jpg`)}
                srcSet={`${require(`../assets/gov/delegatees/${delegateeObject.pic}@2x.jpg`)} 2x, ${require(`../assets/gov/delegatees/${delegateeObject.pic}@3x.jpg`)} 3x`}
                alt={delegateeObject.name}
              />
            }
            {!loading && !delegateeObject.pic &&
              <Blockies seed={delegateeObject.wallet.toLowerCase()} opts={{ seed: delegateeObject.wallet.toLowerCase(), size: 30, scale: 10 }} />
            }
          </DelegateeImageInner>

          <ItemH
            position="absolute"
            top="10px"
            left="10px"
            bg="#00000088"
            padding="6px 10px"
            radius="22px"
          >
            <GoVerified size={12} color="#fff"/>
            <Span size="12px" color="#fff" padding="0px 0px 0px 10px" spacing="0.2em" weight="600" textAlign="center">{delegateeObject.votingPower.toLocaleString()}</Span>
          </ItemH>
        </DelegateeImageOuter>

        <DelegateeProfile>
          <Item>
            <ItemH>
              <Span weight="400" textAlign="center">{delegateeObject.name}</Span>
              <Anchor
                href={delegateeObject.url}
                target="_blank"
                title={"Visit Twitter profile of " + delegateeObject.name}
                bg="transparent"
                radius="4px"
                padding="4px"
                margin="0px 6px"
              >
                <FiTwitter size={12} color="#35c5f3" />
              </Anchor>
            </ItemH>

            <DelegateeWallet size="0.5em" color="#aaa" spacing="0.2em" weight="600" textAlign="center">{delegateeObject.wallet}</DelegateeWallet>
          </Item>
          <ItemBreak></ItemBreak>
          {/* <RadioGroup >
                    <div style={{marginRight:"0px"}}>
                    <input type="radio" id="gasless"  checked={transactionMode=="gasless"}  name="gasless" value="gasless" onChange={e=>setTransactionMode(e.target.value)}/> <br/>
                    <Label><div style={{width:"2rem"}}>  Gasless  <InfoTooltip Infocolor={"gray"} title={"The total rewards you have already claimed from the pool. This includes all the rewards including the ones already harvested."} /> </div>      
                     </Label><br/>
                   </div>
                    <div style={{width:"8rem"}}>
                    <input type="radio" id="withgas" 
                    checked={transactionMode=="withgas"}
                    name="gas" value="withgas" onChange={e=>setTransactionMode(e.target.value)}/>
                    <Label > <div style={{width:"5rem"}}> With Gas   <InfoTooltip Infocolor={"gray"} title={"The total rewards you have already claimed from the pool. This includes all the rewards including the ones already harvested."} /> </div>
                    </Label><br/>  
                    </div>
                    </RadioGroup> */}
                <SelectTag onChange={e=>setTransactionMode(e.target.value)}>
                <>  <option value="gasless"> Gasless  </option> Test</>
                  <option value="withgas">With Gas</option>
                </SelectTag>
          <ItemBreak></ItemBreak>
          <UnsubscribeButton >
                
            {
              
              txLoading ? (
                <ActionTitle>
                  <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={18} spinnerColor={'#fff'} />
                </ActionTitle>
              ): (
                <>
               
                <ActionTitle onClick={() => {
                 delegateAction(delegateeObject.wallet)
                }}
                >Delegate</ActionTitle>
                </>
              )
            }
          </UnsubscribeButton>

          <Item
            position="absolute"
            bottom="10px"
            left="-2px"
            padding="4px"
          >
            <Anchor
              href={delegateeObject.forum}
              target="_blank"
              title={"Visit forum post of " + delegateeObject.name}
              bg="transparent"
              radius="4px"
              padding="2px"
            >
              <IoMdShareAlt size={16} color="#fff" />
            </Anchor>
          </Item>
        </DelegateeProfile>
      </DelegateeItem>
    </Item>
  );
}

// css styles
const SelectTag=styled.select`
  border: none;
  padding: 0 10px;
  background: transparent;
  outline: none;
`;

const DelegateeItem = styled.div`
  max-width: 220px;
  min-width: 220px;
  flex: 1;
  margin: 20px 20px;
  padding: 1px;
  border: 2px solid #fafafa;
  overflow: hidden;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-self: flex-start;
  position: relative;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props => props.theme == "nominee" ? "#35c5f3" : "linear-gradient( 283deg, #34c5f2 0%, #e20880 45%, #35c5f3 100%)"};
  }
`

const DelegateeImageOuter = styled.div`
  padding-top: 100%;
  position: relative;
`

const DelegateeImageInner = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  border-top-right-radius: 16px;
  border-top-left-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
`

const DelegateeProfile = styled(ItemH)`
  background: #fff;
  border-bottom-right-radius: 16px;
  border-bottom-left-radius: 90px;
  padding: 20px;
`

const DelegateeWallet = styled(Span)`
  word-break: break-all;
  padding-top: 4px;
`

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
  ${ props => props.disabled && css`
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
`

const ActionTitle = styled.span`
  ${ props => props.hideit && css`
    visibility: hidden;
  `};
`

const UnsubscribeButton = styled(ChannelActionButton)`
  background: #000;
`

const Toaster = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0px 10px;
`

const ToasterMsg = styled.div`
  margin: 0px 10px;
`
// Export Default
export default ViewDelegateeItem;
