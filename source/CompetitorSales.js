var CompetitorSales = {};
(function () {
	//Calculate total sales for a game
	//CURRENTLY ONLY WORKS FOR COMPETITOR GAMES WITH 1 PLATFORM
	CompetitorSales.calculateSales = function (competitor, game) {
		var score = game.score.clamp(1, 10);
		
		//Larger games have access to a bigger market size
		var getMarketSizeFactor = function (game) {
			var bonusFactor = 0;
			switch (game.gameSize) {
			case "medium":
				bonusFactor = 1;
				break;
			case "large":
				bonusFactor = 1.2;
				break;
			case "aaa":
				bonusFactor = 1.5;
				break;
			default:
				return 1;
			}
			return 1 + bonusFactor;
		};

		var scoreRatio = score / 10;
		var fans = Math.min(15E5, competitor.fans) + Math.max(0, competitor.fans - 15E5) / 10;
		var minTech = 8;

		if (game.platform.id != "PC")
			minTech = Math.min(minTech, game.platform.techLevel);

		var currentTechLevel = game.platform.techLevel;
		if (game.platform.id == "PC")
			currentTechLevel = minTech;
		
		//Calculate the market size, the market reach, final reach and total units sold for the game
		var marketSize = Platforms.getMarketSizeForWeek(game.platform, GameManager.company.currentWeek, competitor) * (1 / currentTechLevel * minTech) * getMarketSizeFactor(game);
		var marketReach = 0;
		var reachBalanceF = 1;
		
		//Adjust reach based on game score, games with a higher score will reach more people
		if (score <= 9) {
			marketReach = Math.pow(score, 3) / 100 * 0.2;
			if (GameManager.company.currentLevel === 4)
				reachBalanceF = 1.25
		} else {
			marketReach = Math.pow(score, 3) / (100 - 35 * (score - 9));
			if (GameManager.company.getCurrentDate().year < 6)
				reachBalanceF = 0.65;
			else if (GameManager.company.currentLevel === 4)
				reachBalanceF = 0.35;
			else
				reachBalanceF = 0.5
		}

		marketReach = (marketReach * reachBalanceF) / 15 * 0.2 + 0.008;
		marketReach *= Platforms.getAudienceWeighting([game.platform], game.targetAudience);
		var reach = Math.floor(Math.min(marketSize * marketReach, marketSize)) + fans * scoreRatio;
		var unitSales = Math.floor(reach * 0.8 * scoreRatio + reach * 0.2 * GameManager.company.getRandom());
		
		//Calculate the total fans gained from the game
		var fanModification = 0;
		if (score >= 7)
			fanModification += fans * 0.05 + fans * 0.05 * GameManager.company.getRandom();
		if (score >= 5)
			fanModification += Math.floor(unitSales * 0.005 * scoreRatio + unitSales * 0.005 * GameManager.company.getRandom());
		else
			fanModification = -competitor.fans * (1 - scoreRatio) * 0.25 * GameManager.company.getRandom();

		//Calculate the base total sales
		game.unitPrice = Sales.getUnitPrice(game);
		var sales = unitSales * game.unitPrice;
		if (!game.totalSalesCash)
			game.totalSalesCash = 0;

		game.totalSalesCash += sales;
		game.fansChangeTarget = fanModification;
	};

	CompetitorSales.getIncome = function (game) {
		var salesLeft = game.totalSalesCash - game.currentSalesCash;
		var cashIncome = salesLeft;
		var salesEnd = 0.1;
		var beforeAll = 0.01;
		var endFactor = 0.4;
		var normalFactor = 0.2;
		var generalFactor = 1;
		if (game.gameSize === "medium")
			generalFactor = 0.75;
		else if (game.gameSize === "large")
			generalFactor = 0.65;
		else if (game.gameSize === "aaa")
			generalFactor = 0.5;
		if (salesLeft / game.totalSalesCash < salesEnd * generalFactor) {
			if (salesLeft / game.totalSalesCash > beforeAll * generalFactor)
				cashIncome = salesLeft * (GameManager.company.getRandom() * endFactor * generalFactor + endFactor * generalFactor);
		} else
			cashIncome = salesLeft * (GameManager.company.getRandom() * normalFactor * generalFactor + normalFactor * generalFactor);
		return cashIncome
	};

	//Calculate weekly sales for a game
	CompetitorSales.sellGame = function (competitor, game) {
		if (!game.unitsSold)
			game.unitsSold = 0;
		if (!game.revenue)
			game.revenue = 0;
		if (game.flags.saleCancelled)
			game.totalSalesCash = game.currentSalesCash;
		
		//Process the next sales for the game
		if (game.nextSalesCash) {
			game.fansChanged += game.nextfansChange;
			game.currentSalesCash += game.nextSalesCash;
			game.unitsSold += Math.floor(game.nextSalesCash / game.unitPrice);
			
			if (game.nextSalesCash != 0) {
				competitor.cash += game.nextSalesCash;
				game.revenue += game.nextSalesCash;
			}
			
			if (game.nextfansChange != 0)
				competitor.fans = Math.max(competitor.fans + Math.floor(game.nextfansChange), 0);
			
			game.nextSalesCash = undefined;
		}

		//Check if the game can be sold for another week
		if (game.totalSalesCash > game.currentSalesCash && !game.flags.saleCancelled) {
			var cashIncome = CompetitorSales.getIncome(game);
			var part = cashIncome / game.totalSalesCash;

			//Check if similar games are on the market
			var market = CompetitorMod.competitors.filter(function (c) { return /*c.id != competitor.id &&*/ c.gameOnMarket != null });
			var similarGames = market.map(function (c) {
				return c.gameOnMarket
			}).filter(function (g) {
				return g.topic.id == game.topic.id && g.platform.id == game.platform.id
			});

			var gainModifier = 1;
			for (g = 0; g < similarGames.length; g++) {
				var score = similarGames[g].score;
				var scoreDif = score - game.score;
				if (game.score <= score)
					gainModifier -= 0.1 * Math.max(1, scoreDif);
				else if (game.score > score)
					gainModifier += 0.1 * scoreDif;
			}

			var newIncome = cashIncome * gainModifier;
			var incomeDif = newIncome - cashIncome;
			game.totalSalesCash += incomeDif;
			game.nextfansChange = Math.floor(game.fansChangeTarget * part * gainModifier);
			game.nextSalesCash = Math.floor(newIncome);

			if (game.nextSalesCash <= 0) {
				game.nextSalesCash = undefined;
				game.totalSalesCash = game.currentSalesCash;
			}
		} else {
			//Take the game off the market
			game.soldOut = true;
			competitor.gameOnMarket = null;
			var msg = "{0} by {1} is now off the market. It sold {2} units generating {3} in sales.".localize().format(game.name, competitor.name, UI.getLongNumberString(game.unitsSold), UI.getLongNumberString(game.revenue));
			GameManager.company.notifications.push(new Notification("Game off the market.".localize(), msg.localize(), { type: NotificationType.SalesReport }));
			competitor.logMessage(msg);
		}
	};

	//Override the default Sales.sellGame function
	var origSales = Sales.sellGame;
	var newSellGame = function (company, game) {
		//After calling the original function, game.nextSalesCash and game.nextFansChange is calculated, adjust for competitor games on the market 
		origSales(company, game);
		if (game.nextSalesCash) {
			var currentIncome = game.nextSalesCash;
			var part = currentIncome / game.totalSalesCash;

			//Check if similar games are on the market
			var market = CompetitorMod.competitors.filter(function (c) { return c.gameOnMarket != null });
			var similarGames = market.map(function (c) {
				return c.gameOnMarket
			}).filter(function (g) {
				return g.topic.id == game.topic.id && game.platforms.some(function (p) { return g.platform.id == p.id })
			});

			var gainModifier = 1;
			for (g = 0; g < similarGames.length; g++) {
				var score = similarGames[g].score;
				var scoreDif = game.score - score;
				if (game.score <= score)
					gainModifier -= 0.1 * Math.max(1, scoreDif);
				else if (game.score > score)
					gainModifier += 0.1 * scoreDif;
			}

			var newIncome = currentIncome * gainModifier;
			var incomeDif = newIncome - currentIncome;
			game.totalSalesCash += incomeDif;
			game.nextfansChange = Math.floor(game.fansChangeTarget * part * gainModifier);
			game.nextSalesCash = Math.floor(newIncome);

			if (game.nextSalesCash <= 0) {
				game.nextSalesCash = undefined;
				game.totalSalesCash = game.currentSalesCash;
			}
		}
	};
	Sales.sellGame = newSellGame;
})();