// React + Web3 Essentials
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core';
import React from "react";

// External Packages
import LoaderSpinner, { LOADER_TYPE } from 'components/reusables/loaders/LoaderSpinner';
import styled, { css } from 'styled-components';

// Internal Compoonents
import Blockies from "components/BlockiesIdenticon";

// Create Header
function Profile() {
  const { active, error, account, library, chainId } = useWeb3React();

  const [address, setAddress] = React.useState('');
  const [ens, setENS] = React.useState('');
  const [ensFetched, setENSFetched] = React.useState(false);

  React.useEffect(() => {
    if (account && account != '') {
      // Check if the address is the same
      if (address !== account) {
        setENS('');
        setENSFetched(false);

        // get ens
        library
          .lookupAddress(account).then(function(name) {
            setENS(name);
            setENSFetched(true);
            setAddress(account);
          })
          .catch(() => {
            setENSFetched(true);
            setAddress(account);
          })
      }

    }
  }, [account]);

  // to create blockies

  return (
    <>
    {account && account !== '' && !error &&
      <Container>
        <Blocky>
          <BlockyInner>
             <Blockies seed={account.toLowerCase()} opts={{seed: account.toLowerCase(), size: 7, scale: 7}}/>
          </BlockyInner>
        </Blocky>
        <Wallet>
        {!ensFetched &&
          <LoaderSpinner type={LOADER_TYPE.SEAMLESS} spinnerSize={16} spinnerColor="#fff" />
        }
        {ensFetched && ens &&
          <>{ens}</>
        }
        {ensFetched && !ens &&
          <>{account.substring(0, 6)}.....{account.substring(account.length - 6)}</>
        }
        </Wallet>
      </Container>
    }
    </>
  );
}

// css styles
const Container = styled.button`
  margin: 0;
  padding: 0;
  background: none;
  border: 0;
  outline: 0;
  justify-content: flex-start;
  flex: 1,
  flex-direction: row;
  align-items: center;
  display: flex;
`

const Blocky = styled.div`
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 100%;
  overflow: hidden;
  transform: scale(0.85);
  outline-width: 2px;
  outline-color: rgba(225,225,225,1);
`

const BlockyInner = styled.div`
`

const Wallet = styled.span`
  margin: 0px 10px;
  padding: 8px 15px;
  height: 16px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: #fff;
  border-radius: 15px;
  background: rgb(226,8,128);
  background: linear-gradient(107deg, rgba(226,8,128,1) 30%, rgba(103,76,159,1) 70%, rgba(53,197,243,1) 100%);
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
`

// Export Default
export default Profile;
