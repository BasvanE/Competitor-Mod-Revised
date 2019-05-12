//Main entry point for the mod
var CompetitorMod = {};
(function () {
	CompetitorMod.competitors = [];
	var companyNames = {};
	var maxCompetitors = 2;

	//Extend the default startNewGame function
	var oldStartNewGame = GameManager.startNewGame;
	var newStartNewGame = function () {
		CompetitorMod.startNewGame();
		CompetitorUI.updateCompetitorUI();
		oldStartNewGame();
	};
	GameManager.startNewGame = newStartNewGame;

	//Initialize the mod
	CompetitorMod.init = function () {
		CompetitorUI.init();

		GDT.on(GDT.eventKeys.gameplay.weekProceeded, CompetitorMod.tick);
		GDT.on(GDT.eventKeys.saves.loading, CompetitorMod.load);
		GDT.on(GDT.eventKeys.saves.saving, CompetitorMod.save);

		companyNames = $.extend([], CompanyNames);
		companyNames.push("Sienna", "Ubicroft", "MinniSoft", "AreaNet","Backbone Media", "BionicWare", "Black Wolf Games", "Bulldog Productions", "Kogonami", "Eagle Software");
	};

	//Save mod data on game save
	CompetitorMod.save = function (e) {
		var data = e.data;
		var competitorModData = data['competitorModData'];
		if (!competitorModData)
			competitorModData = data.competitorModData = {};
		competitorModData["competitors"] = CompetitorMod.competitors.map(function (n) { return n.save() });
	};

	//Load mod data on game load
	CompetitorMod.load = function (e) {
		var data = e.data;
		var competitorModData = data['competitorModData'];
		if (!competitorModData) {
			CompetitorMod.startNewGame();
		} else if (competitorModData["competitors"]) {
			CompetitorMod.competitors = competitorModData["competitors"].map(function (o) { return CompetitorLib.load(o) });
		}

		CompetitorUI.updateCompetitorUI();
	};

	//Process a game tick for all competitors
	CompetitorMod.tick = function () {
		for (var c = 0; c < CompetitorMod.competitors.length; c++) {
			var competitor = CompetitorMod.competitors[c];
			if (competitor.flagForRemoval == true) {
				CompetitorMod.competitors.remove(competitor);
				continue;
			}
			competitor.tick();
		}

		//Sort and update the competitor UI
		CompetitorMod.sortCompetitors();
		CompetitorUI.updateCompetitorUI();
	};

	//Add new competitors at the start of a new game
	CompetitorMod.startNewGame = function () {
		CompetitorMod.competitors = [];
		for (var i = 0; i < maxCompetitors; i++)
			CompetitorMod.addNewCompetitor(true);
	};

	//Add a new competitor to the game
	CompetitorMod.addNewCompetitor = function (newGameInstance, newName, cash, owned) {
		var name = companyNames.pickRandom();
		if (newName != null) {
			name = newName;
		}

		//Check if name is used already
		for (var i = 0; i < CompetitorMod.competitors.length; i++) {
			var competitor = CompetitorMod.competitors[i];
			if (competitor.name == name) {
				if (newGameInstance !== undefined || newGameInstance !== null) {
					CompetitorMod.addNewCompetitor(newGameInstance);
				} else if (newName !== undefined || newName !== null) {
					CompetitorMod.addNewCompetitor(newGameInstance, newName, cash, owned);
				} else {
					CompetitorMod.addNewCompetitor();
				}
				return;
			}
		}

		//Create a new competitor with 4 random starting topics
		var new_competitor = CompetitorLib.createCompetitor("ID_" + name.replace(/\s/g, ""), name, [], CompetitorMod.getRandomTopics().slice(0, 4));

		if (!newGameInstance) {
			new_competitor.cash = 2500000;
		}
		if (cash != null) {
			new_competitor.cash = cash;
		}
		if (owned != null) {
			new_competitor.owned = owned;
		}

		//Add the new competitor to the list of all competitors
		CompetitorMod.competitors.push(new_competitor);
	};

	//Randomize the topics
	CompetitorMod.getRandomTopics = function () {
		var original = Topics.topics;
		var finalOrder = original.slice(0, 0);
		var rest = original.slice(0);
		var random = new MersenneTwister(Math.floor(Math.random() * 65535));
		while (rest.length > 0) {
			var index = Math.floor(random.random() * rest.length);
			finalOrder.push(rest[index]);
			rest.splice(index, 1)
		}
		return finalOrder
	};

	//Sort the competitors based on their cash
	CompetitorMod.sortCompetitors = function () {
		CompetitorMod.competitors.sort(function (a, b) {
			return a.cash - b.cash;
		});
		CompetitorMod.competitors.reverse();
	};

	//UI Actions
	CompetitorMod.showGameHistory = function (competitor) {
		var games = competitor.gameLog;
		if (games.length > 0) {
			GameManager.pause(true);
			var dlg = $("#gameHistoryDialog");
			var content = dlg.find("#gameHistoryContent");
			content.empty();
			dlg.find(".windowTitle").text(competitor.name + " Game History");

			var slider = $('<div class="gameHistorySliderContainer royalSlider rsDefaultInv"></div>');
			content.append(slider);
			games.slice().sort(function (a,
				b) {
				if (a.releaseWeek > b.releaseWeek)
					return 1;
				return -1
			});
			for (var i = games.length - 1; i >= 0; i--) {
				var game = games[i];
				if (!game.flags.isExtensionPack || forPostMortem) {
					var element = CompetitorMod.getElementForGameDetail(game, game.score);
					slider.append(element)
				}
			}

			UI.maxFont(dlg.find(".windowTitle"), 34, 50);
			var buttonText = "OK".localize();
			dlg.find(".okButton").text(buttonText).clickExcl(function () {
				Sound.click();
				$("#gameHistoryDialog").dialog("close");
				GameManager.resume(true)
			});
			if (PlatformShim.ISWIN8)
				slider.gdSlider();
			dlg.dialog({
				draggable: false,
				width: 660,
				height: 650,
				modal: true,
				resizable: false,
				show: "fade",
				zIndex: 6000,
				open: function () {
					var closeButton =
						$(this).parents(".ui-dialog:first").find(".closeDialogButton");
					if (closeButton.length == 0) {
						closeButton = $(UI.closeButtonTemplate);
						$(this).parents(".ui-dialog:first").append(closeButton)
					}
					closeButton.zIndex = 4500;
					closeButton.clickExclOnce(function () {
						Sound.click();
						dlg.dialog("close")
					});
					$(this).siblings(".ui-dialog-titlebar").remove();
					$(this).parents(".ui-dialog:first").addClass("tallWindow");
					$(this).parents(".ui-dialog:first").addClass("windowBorder");
					$(this).parents(".ui-dialog:first").removeClass("ui-widget-content");
					var that = this;
					if (!PlatformShim.ISWIN8)
						slider.gdSlider()
				},
				close: function () {
					$(this).dialog("destroy");
					this.style.cssText = "display:none;";
					GameManager.resume(true)
				}
			})
		}
	};

	CompetitorMod.getElementForGameDetail = function (game, avgReview) {
		var date = GameManager.company.getDate(game.releaseWeek);
		var template = $("#gameDetailsTemplate").clone();
		template.removeAttr("id");
		template.find(".gameDetailsTitle").text(game.name);
		if (UI._gameDetailsColumn1FontSize == undefined) {
			var column1 = template.find(".gameDetailsColumn1");
			var texts = [];
			for (var i = 0; i < column1.length; i++)
				if (column1[i].innerText)
					texts.push(column1[i].innerText);
			var fontName = UI.IS_SEGOE_UI_INSTALLED ?
				"Segoe UI" : "Open Sans";
			UI._gameDetailsColumn1FontSize = 15;
			var font = "bolder {0}pt {1}".format(UI._gameDetailsColumn1FontSize, fontName);
			for (var i = 0; i < texts.length; i++) {
				if (UI._gameDetailsColumn1FontSize == 10)
					break;
				var text = new createjs.Text(texts[i], font, "black");
				if (text.getMeasuredWidth() > 180) {
					UI._gameDetailsColumn1FontSize -= 1;
					font = "{0}pt {1}".format(UI._gameDetailsColumn1FontSize, fontName);
					i--
				}
			}
		}
		template.find(".gameDetailsColumn1").css({
			"font-size": UI._gameDetailsColumn1FontSize + "pt"
		});
		if (!UI.IS_SEGOE_UI_INSTALLED) {
			template.find(".gameDetailsColumn1").css({
				"font-family": "Open Sans"
			});
			template.find(".gameDetailsColumn2").css({
				"font-size": "12pt",
				"font-family": "Open Sans"
			})
		}
		if (game.secondGenre)
			template.find(".gameDetailsTopicGenre").text(game.topic.name + "/" + game.genre.name + "-" + game.secondGenre.name);
		else
			template.find(".gameDetailsTopicGenre").text(game.topic.name + "/" + game.genre.name);
		var platform = game.platform.name;
		template.find(".gameDetailsPlatform").text(platform);
		template.find(".gameDetailsImage").attr("src", Platforms.getPlatformImage(game.platform, game.releaseWeek));
		template.find(".gameDetailsCosts").text(UI.getShortNumberString(game.costs));
		if (game.releaseWeek > GameManager.company.currentWeek)
			template.find(".gameDetailsReleaseWeek").text("coming soon".localize());
		else
			template.find(".gameDetailsReleaseWeek").text("Y{0} M{1} W{2}".localize("date display").format(date.year,
				date.month, date.week));
		if (game.totalSalesCash > 0) {
			template.find(".gameDetailsAmountEarned").text(UI.getShortNumberString(game.totalSalesCash));
			var profitElement = template.find(".gameDetailsTotal");
			var profit = game.totalSalesCash - game.costs;
			if (profit < 0) {
				template.find(".gameDetailsTotalLabel").text("Loss:".localize());
				profitElement.addClass("red")
			} else
				profitElement.addClass("green");
			profitElement.text(UI.getShortNumberString(profit));
			template.find(".gameDetailsFansChange").text(UI.getLongNumberString(Math.max(0, Math.round(game.fansChanged))));
			if (game.topSalesRank > 0)
				template.find(".gameDetailsTopSalesRank").text(game.topSalesRank);
			else
				template.find(".gameDetailsTopSalesRank").text("");
			template.find(".gameDetailsTopSalesRankLabel").text("");
			template.find(".gameDetailsUnitsSold").text("");
			template.find(".gameDetailsUnitsSoldLabel").text("");
		} else {
			var displayText = game.flags.isExtensionPack ? "-" : "?";
			template.find(".gameDetailsUnitsSold").text(displayText);
			template.find(".gameDetailsAmountEarned").text(displayText);
			template.find(".gameDetailsTotal").text(displayText);
			template.find(".gameDetailsFansChange").text(displayText);
			template.find(".gameDetailsTopSalesRank").text(displayText);
			template.find(".gameDetailsAmountEarned").removeClass("green")
		}
		template.find(".gameAverageScoreOverview").text(avgReview);
		template.find(".gameDetailsAvgReview").text(avgReview)

		return template
	};
})();