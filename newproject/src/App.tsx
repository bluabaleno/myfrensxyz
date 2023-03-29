import { useEffect, useState } from 'react'
import { SafeEventEmitterProvider } from '@web3auth/base'
import { Box, Button, Divider, Grid, Typography } from '@mui/material';
import { EthHashInfo } from '@safe-global/safe-react-components'
import { SafeAuthKit, SafeAuthProviderType, SafeAuthSignInData } from '../../src/index'
import AppBar from './AppBar'
import { SafeAccountConfig, SafeDeploymentConfig, SafeFactory } from '@safe-global/safe-core-sdk';
import EthersAdapter from '@safe-global/safe-ethers-lib';
import { ethers } from 'ethers';

function App() {
  const [safeAuthSignInResponse, setSafeAuthSignInResponse] = useState<SafeAuthSignInData | null>(
    null
  )
  const [safeAuth, setSafeAuth] = useState<SafeAuthKit>()
  const [provider, setProvider] = useState<SafeEventEmitterProvider | null>(null)

  useEffect(() => {
    ;(async () => {
      const auth = await SafeAuthKit.init(SafeAuthProviderType.Web3Auth, {
        chainId: '0x5',
        txServiceUrl: 'https://safe-transaction-goerli.safe.global',
        authProviderConfig: {
          rpcTarget: `https://goerli.infura.io/v3/${import.meta.env.VITE_INFURA_KEY}`,
          clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID || '',
          network: 'testnet',
          theme: 'dark',
        },
      });
      console.log('SafeAuth object:', auth);
      setSafeAuth(auth);
    })();
  }, []);

  const initializeSafe = async () => {
    const DEPLOYER_ADDRESS_PRIVATE_KEY = '05fd34366f354126a952fb1a93971737ba19eb6b1e9088ce23c2dc17e70bee27';
    const HARDCODED_OWNER = '0xBb2aC9fFbF0a335bEaB0647C67DFA3D6b20197b1';
    const provider = new ethers.providers.JsonRpcProvider('https://goerli.infura.io/v3/57153a4f9bab4f24a77c60478471b009');
    const deployerSigner = new ethers.Wallet(DEPLOYER_ADDRESS_PRIVATE_KEY, provider);
  
    // Create EthAdapter instance
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: deployerSigner
    });
  
    // Create SafeFactory instance
    const safeFactory = await SafeFactory.create({ ethAdapter });
  
    // Config of the deployed Safe
    const safeAccountConfig: SafeAccountConfig = {
      owners: [safeAuthSignInResponse!.eoa, HARDCODED_OWNER],
      threshold: 1
    };
    const safeDeploymentConfig: SafeDeploymentConfig = {
      saltNonce: '1'
    };
  
    // Predict deployed address
    const predictedDeployAddress = await safeFactory.predictSafeAddress({
      safeAccountConfig,
      safeDeploymentConfig
    });
  
    function callback(txHash: string) {
      console.log('Transaction hash:', txHash);
    }
  
    // Deploy Safe
    const safe = await safeFactory.deploySafe({
      safeAccountConfig,
      safeDeploymentConfig,
      callback
    });
  
    console.log('Predicted deployed address:', predictedDeployAddress);
    console.log('Deployed Safe:', safe.getAddress());
  };
  
  
  const login = async () => {
    if (!safeAuth) return

    const response = await safeAuth.signIn()
    console.log('SIGN IN RESPONSE: ', response)
    console.log("Ethereum address: ", response.eoa);

    setSafeAuthSignInResponse(response)
    setProvider(safeAuth.getProvider() as SafeEventEmitterProvider)
  }

  const logout = async () => {
    if (!safeAuth) return

    await safeAuth.signOut()

    setProvider(null)
    setSafeAuthSignInResponse(null)
  }

  return (
    <>
      <AppBar onLogin={login} onLogout={logout} isLoggedIn={!!provider} />
      {safeAuthSignInResponse?.eoa && (
        <Grid container>
          <Grid item md={4} p={4}>
            <Typography variant="h3" color="secondary" fontWeight={700}>
              Owner account
            </Typography>
            <Divider sx={{ my: 3 }} />
            <EthHashInfo
              address={safeAuthSignInResponse.eoa}
              showCopyButton
              showPrefix
              prefix={getPrefix(safeAuthSignInResponse.chainId)}
            />
          </Grid>
          <Grid item md={8} p={4}>
            <>
              <Typography variant="h3" color="secondary" fontWeight={700}>
                Available Safes
              </Typography>
              <Divider sx={{ my: 3 }} />
              {safeAuthSignInResponse?.safes?.length ? (
                safeAuthSignInResponse?.safes?.map((safe, index) => (
                  <Box sx={{ my: 3 }} key={index}>
                    <EthHashInfo address={safe} showCopyButton shortAddress={false} />
                  </Box>
                ))
              ) : (
                <Typography variant="body1" color="secondary" fontWeight={700}>
                  No Available Safes
                </Typography>
              )}
              <Box sx={{ mt: 3 }}>
                <Button variant="contained" onClick={initializeSafe}>
                  Create Safe
                </Button>
              </Box>
            </>
          </Grid>
        </Grid>
      )}
    </>
  );
}

const getPrefix = (chainId: string) => {
  switch (chainId) {
    case '0x1':
      return 'eth'
    case '0x5':
      return 'gor'
    case '0x100':
      return 'gno'
    case '0x137':
      return 'matic'
    default:
      return 'eth'
  }
}

export default App
