
import * as ethers from "ethers";
import erc165Abi from "../abi/IERC165";

const makeInterfaceChecker =
  (interfaceIdentifier: number) =>
  (address: string, provider: ethers.providers.Provider) => {
    const contract = new ethers.Contract(address, erc165Abi, provider);
    return contract.supportsInterface(interfaceIdentifier);
  };

const isErc721 = makeInterfaceChecker(0x80ac58cd);
const isErc721Metadata = makeInterfaceChecker(0x5b5e139f);
const isErc721Enumerable = makeInterfaceChecker(0x780e9d63);

