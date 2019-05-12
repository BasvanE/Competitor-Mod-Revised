//Module for competitor functions and 
var CompetitorLib = {};
var Experience;
(function () {
	CompetitorLib.createCompetitor = function (id, name, genres, topics) {
		return new Competitor(id, name, genres, topics);
	};

	var Competitor = function (id, name, genres, topics) {
		//Company properties
		this.id = id;
		this.name = name;
		this.cash = 75000;
		this.fans = 0;
		this.activeGenres = genres;
		this.activeTopics = topics;
		this.licensedPlatforms = [Platforms.allPlatforms[0], Platforms.allPlatforms[1]];
		this.gameLog = [];
		this.gameOnMarket = null;
		this.currentAction = null;
		this.currentGame = null;
		this.weeklyCosts = 2000;
		this.devDuration = 10;

		//Additional information
		this.baseKnowledge = DefaultKnowledge();
		this.exactKnowledge = [];
		this.exploreRate = 0.5;
		this.flags = {};

		//Process a tick for the competitor
		this.tick = function () {
			if (this.currentAction == null) {
				if (this.reportAvailable()) {
					this.currentAction = CompetitorActions.createAction("Game Report", 1);
					this.logMessage("Started action: " + this.currentAction.name);
				} else if (this.canDevelopGame()) {
					var possibleTopics = this.availableTopics();
					if (possibleTopics.length > 1 && GameManager.company.getRandom() > 0.3) {
						this.currentGame = this.generateGame(possibleTopics);
						this.cash -= this.currentGame.costs;
						this.currentAction = CompetitorActions.createAction("Game Creation", Math.round(this.devDuration + this.devDuration * GameManager.company.getRandom() * 0.25));
						this.logMessage("Started action: " + this.currentAction.name);
					} else {
						this.currentAction = CompetitorActions.createAction("Research Topic", 1);
						this.logMessage("Started action: " + this.currentAction.name);
					}
				}
			} else {
				this.currentAction.tick(this);
				if (this.currentAction.deadline <= Math.floor(GameManager.company.currentWeek)) {
					this.currentAction.finish(this);
					this.logMessage("Finished action: " + this.currentAction.name);
					this.currentAction = null;
				}
			}
			this.processWeek();
		};

		//Process weekly occurrences for a competitor
		this.processWeek = function () {
			this.cash -= this.weeklyCosts;

			if (this.gameOnMarket != null)
				CompetitorSales.sellGame(this, this.gameOnMarket);

			if (this.cash < -50000)
				GameManager.company.notifications.push(DecisionNotifications.bankruptcyNotification.getNotification(this));
		};

		//Generate a new game based on the available topics
		this.generateGame = function (topics) {
			var game = CompetitorGameLib.createCompetitorGame(this.name, this.generateGameName());
			var topicGenre = this.getTopicGenre(topics);
			game.topic = topicGenre[0];
			game.genre = topicGenre[1];
			game.platform = this.getPlatform(game.genre);
			game.costs = game.platform.developmentCosts;
			game.score = this.generateGameScore(game);
			
			CompetitorSales.calculateSales(this, game);

			console.log("Name: {0}, Topic: {1}, Genre: {2}, Platform: {3}, Score: {4}, Week: {5}".format(game.name, game.topic.id, game.genre.id, game.platform.id, game.score, Math.floor(GameManager.company.currentWeek)));
			return game;
		};

		//Determine the topic and genre of the game
		this.getTopicGenre = function (topics) {
			var topic = undefined;
			var genre = undefined;
			var usedTopics = this.gameLog.map(function (g) { return g.topic });
			var topicGenreMatch = 0;

			//Query for knowledge of used topics
			for (t = 0; t < usedTopics.length; t++) {
				var curTopic = usedTopics[t];
				var result = this.queryKnowledgeBase("exact", curTopic);

				for (i = 0; i < result.length; i++) {
					var information = result[i];
					if (information.match > 0.8 && information.match > topicGenreMatch) {
						topic = curTopic;
						genre = GameGenre.getAll().first(function (g) { return g.id == information.genreId });
						topicGenreMatch = information.match;
					} else if (information.match > 0.8 && information.match == topicGenreMatch) {
						var allUses = this.gameLog.filter(function (g) { return g.topic.id == topic.id || g.topic.id == curTopic.id });
						var secondToLastUse = allUses[allUses.length - 2];
						topic = secondToLastUse.topic;
						genre = secondToLastUse.genre;
					}
				}
			}

			//Check if we need to explore or not
			if (topic != undefined && genre != undefined) {
				var r = GameManager.company.getRandom();
				if (r < this.exploreRate)
					this.exploreRate = this.exploreRate - 0.1;
				else {
					topic = undefined;
					this.exploreRate = this.exploreRate + 0.1;
				}
			} else {
				//Select a random topic and matching genre
				topic = topics.pickRandom();
				var genres = this.queryKnowledgeBase("base", topic).posGenres;
				genre = genres.pickRandom();
			}

			console.log("Topic: {0}, Genre: {1}, Match: {2}".format(topic.id, genre.id, GameGenre.getGenreWeighting(topic.genreWeightings, genre)));
			return [topic, genre];
		};

		//Determine the platform of the game
		this.getPlatform = function (genre) {
			var platform = Platforms.allPlatforms[0];
			var platformsOnMarket = Platforms.getPlatformsOnMarket(GameManager.company);
			var sortedPlatforms = platformsOnMarket.sort(this.platformSort);

			//Look through the platforms on the market in descending order of market share
			for (p = 0; p < sortedPlatforms.length; p++) {
				var plat = sortedPlatforms[p];

				//Check if a licensed platform can be used or a license can be bought
				if (this.licensedPlatforms.indexOf(plat) > -1 && plat.developmentCosts < this.cash / 2.5) {
					var result = this.queryKnowledgeBase("exact", plat).first(function (r) { return r.genreId == genre.id });
					if (result && result.match >= 0.9) {
						platform = plat;
						break;
					} else if (GameManager.company.getRandom() < this.exploreRate + 0.05 * (sortedPlatforms.length - p)) {
						this.exploreRate -= 0.1;
						platform = plat;
					} else {
						this.exploreRate += 0.1;
						continue;
					}
				} else if (this.cash - plat.licencePrize > plat.developmentCosts + (this.weeklyCosts * (this.devDuration + 2))) {
					this.cash -= plat.licencePrize;
					this.licensedPlatforms.push(plat);
					platform = plat;
					break;
				}
			}

			console.log("Platform: {0}, Genre: {1}, Match: {2}".format(platform.id, genre.id, Platforms.getGenreWeighting(platform.genreWeightings, genre)));
			return platform;
		};

		//Generate the score for a game
		this.generateGameScore = function (game) {
			var score;
			var maxScore = 0;
			var r = GameManager.company.getRandom();

			//Set the maximum score based on topic/genre combo and adjust random value
			switch (GameGenre.getGenreWeighting(game.topic.genreWeightings, game.genre)) {
				case 0.6:
					r -= 0.10;
					maxScore = 3;
					break;
				case 0.7:
					r -= 0.05;
					maxScore = 5;
					break;
				case 0.8:
					maxScore = 7;
					break;
				case 0.9:
					r += 0.10;
					maxScore = 9;
					break;
				case 1:
					r += 0.15;
					maxScore = 10;
			}

			//During the first level (garage) the maximum score is 8
			if (GameManager.company.currentLevel == 1)
				maxScore = Math.min(maxScore, 8);

			//Check if topic is original or has been used too quickly
			var lastUse = this.gameLog.first(function (g) { return g.topic.id == game.topic.id });
			if (lastUse == null)
				r += 0.1;
			else
				if (GameManager.company.currentWeek - lastUse.releaseWeek < 40)
					r -= 0.1;

			//Calculate final unrounded score
			if (r <= 0.15)
				score = maxScore * 0.75;
			else if (r <= 0.35)
				score = maxScore * 0.80;
			else if (r <= 0.75)
				score = maxScore * 0.85;
			else if (r <= 0.9)
				score = maxScore * 0.95;
			else if (r <= 1 || r > 1)
				score = maxScore;

			return Math.round(score * 4) / 4;;
		};

		//Check if there are topics available to create a game with
		//Returns: Combined list of unused topics and used topics that haven't been used for 40 weeks or more
		this.availableTopics = function () {
			var availableTopics = [];
			var prevTopics = this.gameLog.map(function (g) { return g.topic });
			var unusedTopics = this.activeTopics.filter(function (t) { return prevTopics.indexOf(t) < 0; });

			for (t = 0; t < unusedTopics.length; t++)
				availableTopics.push(unusedTopics[t]);

			for (t = 0; t < prevTopics.length; t++) {
				var latestUse = this.gameLog.last(function (g) { return g.topic == prevTopics[t] });
				if (GameManager.company.currentWeek - latestUse.releaseWeek > 40)
					availableTopics.push(latestUse.topic);
			}

			return availableTopics;
		};

		//Look in the appropriate knowledge base if there is anything known about the item
		//Returns: an array of items from the knowledge base
		this.queryKnowledgeBase = function (type, item) {
			if (type == "base")
				var result = this.baseKnowledge.first(function (i) { return i.itemId == item.id });
			if (type == "exact")
				var result = this.exactKnowledge.filter(function (i) { return i.itemId == item.id });

			return result;
		};

		//Check if a game report is available for the last game
		this.reportAvailable = function () {
			if (this.gameLog.length > 0)
				return !this.gameLog.last().gameReport;
			else
				return false;
		};

		//Check if a game can be developed
		this.canDevelopGame = function () {
			if (this.gameOnMarket && (this.gameOnMarket.currentSalesCash / this.gameOnMarket.totalSalesCash) >= 0.8)
				return true;
			else if (this.gameOnMarket)
				return false;
			return true;
		};

		//Add a new topic to the active topics list
		this.addNewTopic = function () {
			var newTopic;
			var foundTopic;
			do {
				foundTopic = null;
				newTopic = CompetitorMod.getRandomTopics().slice(0, 1)[0];
				foundTopic = this.activeTopics.first(function (item) { return item.id === newTopic.id });
			} while (foundTopic != null && foundTopic.id === newTopic.id);

			this.activeTopics.push(newTopic);
		};

		//Generate a name for a game
		this.generateGameName = function () {
			var name = null;
			do {
				name = NameGeneration.generateGameName();
			} while (this.gameLog.some(function (item) {
				return item.name == name;
			}));
			return name;
		};

		//Sort function that sorts platforms based on market share
		this.platformSort = function(p1, p2) {
			var p1Share = Platforms.getTotalMarketSizePercent(p1, GameManager.company);
			var p2Share = Platforms.getTotalMarketSizePercent(p2, GameManager.company);
			if (p1Share > p2Share)
				return -1;
			if (p1Share < p2Share)
				return 1;
			return 0;
		};

		//Template log message for competitors
		this.logMessage = function (text) {
			console.log("Competitor: {0} - Week: {1} - {2}".format(this.name, Math.floor(GameManager.company.currentWeek), text));
		};

		//Display debug data when hovering over a competitor
		this.getDebugData = function () {
			var str = "";
			if (this.currentAction != null)
				str += "Current Action: {0} \x0D".format(this.currentAction.name);
			else
				str += "No Current Action";

			return str;
		};

		//Save competitor data
		this.save = function () {
			console.log("Saving Competitor: {0}".format(this.name));
			var data = {};
			data["id"] = this.id;
			data["name"] = this.name;
			data["cash"] = this.cash;
			data["fans"] = this.fans;
			data["activeGenres"] = this.activeGenres.map(function (n) {
				return n.save()
			});
			data["activeTopics"] = this.activeTopics.map(function (n) {
				return TopicsSerializer.save(n)
			});
			data["licensedPlatforms"] = this.licensedPlatforms.map(function (n) {
				return PlatformsSerializer.save(n)
			});
			data["gameLog"] = this.gameLog.map(function (n) {
				return n.save()
			});
			if (this.currentAction)
				data["currentAction"] = this.currentAction.save();
			if (this.currentGame)
				data["currentGame"] = this.currentGame.save();
			if (this.gameOnMarket)
				data["gameOnMarket"] = this.gameOnMarket.save();
			data["exactKnowledge"] = this.exactKnowledge;
			data["exploreRate"] = this.exploreRate;
			data["flags"] = this.flags;
			return data
		};
	};

	//The default knowledge each competitor has about topic/genre combos to make better choices
	var DefaultKnowledge = function () {
		var knowledge = [];
		var genres = GameGenre.getAll();
		Topics.topics.concat(Platforms.allPlatforms).forEach(function (i) {
			var posGenres = [];
			for (g = 0; g < genres.length; g++)
				if (i.genreWeightings[g] >= 0.7)
					posGenres.push(genres[g]);
			knowledge.push({ "itemId": i.id, "posGenres": posGenres });
		});
		return knowledge;
	};

	//Load competitor data
	CompetitorLib.load = function (data) {
		var obj = new Competitor();
		obj.id = data["id"];
		obj.name = data["name"];
		obj.cash = data["cash"];
		obj.fans = data["fans"];
		obj.activeGenres = data["activeGenres"].map(function (o) {
			return Genres.load(o)
		});
		obj.activeTopics = data["activeTopics"].map(function (o) {
			return TopicsSerializer.load(o)
		});
		obj.licensedPlatforms = data["licensedPlatforms"].map(function (o) {
			return PlatformsSerializer.load(o)
		});
		if (data["gameLog"])
			obj.gameLog = data["gameLog"].map(function (o) {
				return CompetitorGameLib.load(o)
			});
		if (data["currentAction"])
			obj.currentAction = CompetitorActions.load(data["currentAction"]);
		if (data["currentGame"])
			obj.currentGame = CompetitorGameLib.load(data["currentGame"]);
		if (data["gameOnMarket"])
			obj.gameOnMarket = CompetitorGameLib.load(data["gameOnMarket"]);
		obj.exactKnowledge = data["exactKnowledge"];
		obj.exploreRate = data["exploreRate"];
		obj.flags = data["flags"];
		return obj
	};
})();