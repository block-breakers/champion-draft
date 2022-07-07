from flask import Flask
from flask import request
from flask import jsonify
from flask_cors import CORS
import redis
import json
import asyncio
from listener import EVMListener

app = Flask(__name__)
CORS(app)

f = open("../xdapp.config.json")
config = json.load(f)

abiPath = "../chains/evm/out/CoreGame.sol/CoreGame.json"
abiFile = open(abiPath)
abi = json.load(abiFile)["abi"]

redisConfig = config["server"]["redis"]
redisDatabase = redis.Redis(host=redisConfig["host"], port=redisConfig["port"])

chainListeners = {}

def setup(name):
    chainConfig = config["networks"][name]

    listener = EVMListener(
        name,
        chainConfig["rpc"], 
        chainConfig["deployedAddress"], 
        abi,
        redisDatabase)

    chainListeners[name] = listener

evm0 = "evm0"
setup(evm0)

@app.route("/healthz")
def healthz():
    return "<p>Server up and running!</p>"

@app.route("/champions")
def champions():
    chainName = request.args.get('chain')
    prevListLength = int(request.args.get('idx'))
    if chainName not in chainListeners:
        return jsonify([])
    
    return jsonify(chainListeners[chainName].getChampions(prevListLength))

@app.route("/battles")
def battles():
    chainName = request.args.get('chain')
    championHash = request.args.get('champion')
    if championHash == "" or len(championHash) != 66:
        return "error: please include a 32 bit champion hash in the URL query prefixed with 0x"
    if championHash[0:2] != "0x":
        return "error: please enter champion hash in hex prefixed with 0x"
    prevListLength = int(request.args.get('idx'))

    if chainName not in chainListeners:
        return jsonify([])
    
    return jsonify(chainListeners[chainName].getBattles(championHash, prevListLength))