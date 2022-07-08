from web3 import Web3
import redis
import asyncio
import json
import threading

class EVMListener:

    def __init__(self, name, rpcURL, gameContractAddr, abi, redisDatabase):
        self.name = name

        self.provider = Web3(Web3.HTTPProvider(rpcURL))

        addr2 = Web3.toChecksumAddress(gameContractAddr)
        self.gameContract = self.provider.eth.contract(address=addr2, abi=abi)

        self.registerFilter = self.gameContract.events.championRegistered.createFilter(fromBlock='latest')
        self.outcomeFilter = self.gameContract.events.battleOutcome.createFilter(fromBlock='latest')

        self.redisDatabase = redisDatabase

        loop = asyncio.get_event_loop()
        t = threading.Thread(target=self.startListen, args=(loop, ))
        t.start()
    
    def startListen(self, loop):
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(
                asyncio.gather(
                    self.listen(2)))
        finally:
            # close loop to free up system resources
            loop.close()

    async def listen(self, interval):
        while True:
            for championRegistered in self.registerFilter.get_new_entries():
                print(championRegistered)
                self.redisDatabase.sadd(f"{self.name}-champions", hex(championRegistered.args.championHash))
            for battleOutcome in self.outcomeFilter.get_new_entries():
                print("new battle outcome event", battleOutcome)
                winner = hex(battleOutcome.args.winnerHash)
                loser = hex(battleOutcome.args.loserHash)
                vaa = battleOutcome.args.vaa
                self.redisDatabase.sadd(f"{self.name}-battles-{winner}", vaa)
                self.redisDatabase.sadd(f"{self.name}-battles-{loser}", vaa)
            await asyncio.sleep(interval)

    def getChampions(self):
        print(self.redisDatabase.smembers(f"{self.name}-champions"))
        return list(map(lambda x: x.decode('utf-8'), self.redisDatabase.smembers(f"{self.name}-champions")))

    def getBattles(self, championHash):
        return list(map(lambda x: x.decode('utf-8'), self.redisDatabase.smembers(f"{self.name}-battles-{championHash}")))
    
    def removeBattle(self, championHash, seq):
        return list(map(lambda x: x.decode('utf-8'), self.redisDatabase.srem(f"{self.name}-battles-{championHash}", seq)))

if __name__ == "__main__":
    f = open("../xdapp.config.json")
    config = json.load(f)
    abiPath = "../chains/evm/out/CoreGame.sol/CoreGame.json"
    abiFile = open(abiPath)
    abi = json.load(abiFile)

    r = redis.Redis(host='localhost', port=6379)
    
    listener = EVMListener(
        "evm0-champions",
        config["networks"]["evm0"]["rpc"], 
        config["networks"]["evm0"]["deployedAddress"], 
        abi["abi"],
        r)

    print(listener.getChampions(0))
    