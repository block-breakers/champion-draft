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
        f"{name}-champions",
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
