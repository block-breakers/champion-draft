
import * as ethers from "ethers";
import { BattleInfo } from "./battleStarter";

type UpgradeViewProps = {
  provider: ethers.providers.Web3Provider
};

const UpgradeView = ({ provider }: UpgradeViewProps) => {
  return (
    <div className="p-4 m-4 border">
      <table>
        <thead>
          <tr>
            <th>Attacker</th>
            <th>Damage</th>
          </tr>
        </thead>
        <tbody>
          {battleEvents.map((event) => (
            <tr>
              <td className="px-2 text-center">{event.args.damageByHash.toString()}</td>
              <td className="px-2 text-center">{event.args.damage.toString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="font-bold">Winner: </div>{battleOutcome.args.winnerHash.toString()}
      <br />
      <div className="font-bold">Loser: </div>{battleOutcome.args.loserHash.toString()}
    </div>
  );
};

export default UpgradeView;
