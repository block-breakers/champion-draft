import * as ethers from "ethers";
import { BattleInfo } from "./battleStarter";

type BattleSummaryProps = {
  battleInfo: BattleInfo;
};

const BattleSummary = ({ battleInfo }: BattleSummaryProps) => {
  const { battleEvents, battleOutcome } = battleInfo;
  return (
    <div className="p-4 border m-4">
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

export default BattleSummary;
