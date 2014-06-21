function loadGameJS() {
    $.getScript("/cyvasse.js", function() {
        Module.canvas = document.getElementById("canvas");
    });
}

function CyvasseGameClient(websockConn, loadNewPage) {
    if(websockConn instanceof WebSocket === false) {
        throw new TypeError("websockConn has to be a WebSocket instance");
    }
    if(typeof(loadNewPage) !== "function") {
        throw new TypeError("loadNewPage has to be a function");
    }

    this.conn = websockConn;
    this.loadNewPage = loadNewPage;
    this.nextMessageID = 1;
    this.awaitingReply = [];
    this.gameData = {};

    var self = this;

	this.conn.onmessage = function(msg) {
		self.handlemessage(JSON.parse(msg.data));
	};

    this.conn.onclose = function() {
		console.log("The connection to the server was closed!");
	};
}

CyvasseGameClient.prototype.handlemessage = function(msgObj) {
    if(msgObj.messageType === "request") {
    }
    else if(msgObj.messageType === "reply") {
        var answeredRequest;

        for(var request in this.awaitingReply) {
            if(this.awaitingReply[request].messageID == msgObj.messageID) {
                // remove the request from this.awaitingReply
                // and save it to answeredRequests
                answeredRequest = this.awaitingReply.splice(request, 1)[0];
            }
        }
        if(answeredRequest === undefined) {
            console.log("Got a reply to an unknown server request!");
            return;
        }

        if(answeredRequest.success === false) {
            console.log("Got an error message from the server: " + msgObj.error + "\n" +
                "as response to:\n\n" + JSON.stringify(answeredRequest));
            return;
        }

        switch(answeredRequest.action) {
            case "create game":
                this.loadNewPage("/match/" + msgObj.data.matchID);
                this.gameData.playerID = msgObj.data.playerID;
                // TODO: move this to cyvasse-webapp.js
                $("#emscripten-header").show();
                loadGameJS();
                break;
            case "join game":
                this.gameData.playerID = msgObj.data.playerID;
                this.gameData.color = msgObj.data.color;
                loadGameJS();
        }
    }
    else {
        throw new Error("Got malformed or incomplete message");
    }
};

CyvasseGameClient.prototype.send = function(msgObj) {
    this.conn.send(JSON.stringify(msgObj));
    this.awaitingReply.push(msgObj);
};

CyvasseGameClient.prototype.sendRequest = function(msgObj) {
    msgObj.messageType = "request";
    msgObj.messageID = this.nextMessageID++;

    this.send(msgObj);
};

CyvasseGameClient.prototype.createGame = function(ruleSet, color) {
    this.sendRequest({
        "action": "create game",
        "param": {
            "ruleSet": ruleSet,
            "color": color
        }
    });
};

CyvasseGameClient.prototype.joinGame = function(matchID) {
    this.sendRequest({
        "action": "join game",
        "param": {
            "matchID": matchID
        }
    });
};
