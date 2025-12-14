import { ethers } from 'ethers';
import LaunchpadFactoryABI from '../abis/LaunchpadFactory.json';
import MemeTokenABI from '../abis/MemeToken.json';

export const LAUNCHPAD_FACTORY_ADDRESS = "0x23d496D7Ae68bF9f9FBf97bB9c0d3c3E25964328";
export const FCWEED_TOKEN_ADDRESS = "0x96a986C5996068fb77486076Af7A8A884bc6E214";

export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
};

export const getSigner = async () => {
  const provider = getProvider();
  if (provider) {
    return await provider.getSigner();
  }
  return null;
};

export const getLaunchpadFactoryContract = async (signerOrProvider) => {
  if (!signerOrProvider) {
    const provider = getProvider();
    signerOrProvider = provider;
  }
  return new ethers.Contract(LAUNCHPAD_FACTORY_ADDRESS, LaunchpadFactoryABI.abi, signerOrProvider);
};

export const getMemeTokenContract = (address, signerOrProvider) => {
  return new ethers.Contract(address, MemeTokenABI.abi, signerOrProvider);
};

export const getFCWEEDContract = (signerOrProvider) => {
  return new ethers.Contract(FCWEED_TOKEN_ADDRESS, MemeTokenABI.abi, signerOrProvider); // Using MemeTokenABI as it's standard ERC20
};

export const formatEther = (value) => {
  return ethers.formatEther(value);
};

export const parseEther = (value) => {
  return ethers.parseEther(value);
};
