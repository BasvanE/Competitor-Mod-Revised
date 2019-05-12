var CompetitorGameLib = {};
(function () {
	CompetitorGameLib.createCompetitorGame = function (dev, name) {
		return new CompetitorGame(dev, name);
	};

	var CompetitorGame = function (dev, name) {
		this.developer = dev;
		this.name = name;
		this.score = 0;
		this.fansChanged = 0;
		this.gameSize = "small";
		this.targetAudience = "everyone";
		this.genre = undefined;
		this.topic = undefined;
		this.platform = undefined;
		this.costs = 0;
		this.releaseWeek = 0;
		this.unitsSold = 0;
		this.totalSalesCash = 0;
		this.currentSalesCash = 0;
		this.fansChangeTarget = 0;
		this.gameReport = false;
		this.flags = {};

		this.save = function () {
			var data = {};
			data["developer"] = this.developer;
			data["name"] = this.name;
			data["score"] = this.score;
			data["fansChanged "] = this.fansChanged;
			data["gameSize"] = this.gameSize;
			data["targetAudience"] = this.targetAudience;
			data["genre"] = this.genre.id;
			data["topic"] = this.topic.id;
			data["platform"] = this.platform.id;
			data["costs"] = this.costs;
			data["releaseWeek"] = this.releaseWeek;
			data["unitsSold"] = this.unitsSold;
			data["totalSalesCash"] = this.totalSalesCash;
			data["currentSalesCash"] = this.currentSalesCash;
			data["fansChangeTarget"] = this.fansChangeTarget;
			data["gameReport"] = this.gameReport;
			data["flags"] = this.flags;
			
			return data;
		};
	};

	CompetitorGameLib.load = function (data) {
		if (data) {
			var game = new CompetitorGame();
			game.developer = data["developer"];
			game.name = data["name"];
			game.score = data["score"];
			game.fansChanged = data["fansChanged"];
			game.gameSize = data["gameSize"];
			game.targetAudience = data["targetAudience"];
			if (data["genre"] != undefined)
				game.genre = GameGenre.getAll().first(function (item) { return item.id === data["genre"] });
			if (data["topic"] != undefined)
				game.topic = Topics.topics.first(function (item) { return item.id === data["topic"] });
			if (data["platform"] != undefined)
				game.platform = Platforms.allPlatforms.first(function (item) { return item.id === data["platform"] });
			game.costs = data["costs"];
			game.releaseWeek = data["releaseWeek"];
			game.unitsSold = data["unitsSold"];
			game.totalSalesCash = data["totalSalesCash"];
			game.currentSalesCash = data["currentSalesCash"];
			game.fansChangeTarget = data["fansChangeTarget"];
			game.gameReport = data["gameReport"];
			game.flags = data["flags"];

			return game;
		}
		return undefined;
	};
})();