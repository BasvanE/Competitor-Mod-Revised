﻿//CURRENTLY UNUSED
var CompetitorModPublisher = {};
(function () {
CompetitorModPublisher.contracts = [];

	var PublisherContract = function () {
		this.name;
		this.score = 0;
		this.minScore = 0;
		this.gameSize = "small";
		this.genre = undefined;
		this.topic = undefined;
		this.targetAudience = "everyone";
		this.platforms = [];
		this.penaltyFee = 0;
		this.preBonus = 0;
		this.royalty = 0;
		this.activeCompany = undefined;
		this.active = false;
	}

	CompetitorModPublisher.init = function () {
		CompetitorModPublisher.initUI();
	}
	
	//UI
	CompetitorModPublisher.initUI = function () {
		var html = [];
		html.push('<div id="CompetitorModPublisherContainer" class="windowBorder tallWindow" style="z-index: 5400;overflow:auto;display:none;">');
		html.push('<div id="CompetitorModPublisherTitle" class="windowTitle smallerWindowTitle">Create A Publisher Contract</div>');
		html.push('<div id="CompetitorModPublisherContent"/>');
		html.push('<div id="CompetitorModPublisherTopicChooser"/>');
		html.push('<div id="CompetitorModPublisherGenreChooser"/>');
		html.push('<div id="CompetitorModPublisherPlatformChooser"/>');
		html.push('<div id="CompetitorModPublisherCompetitorChooser"/>');
		html.push('</div>');
		var div = $("body");
		div.append(html.join(""));
	};
	
	CompetitorModPublisher.createContractUI = function () {
		$("#CompetitorModPublisherTopicChooser").hide();
		$("#CompetitorModPublisherGenreChooser").hide();
		$("#CompetitorModPublisherPlatformChooser").hide();
		$("#CompetitorModPublisherCompetitorChooser").hide();

		var content = $("#CompetitorModPublisherContent");
		content.empty();
		
		content.append("<div class='contractName centeredButtonWrapper'> <input id='contractNameInput' type='text' maxlength='35' value='Contract Name' style='width:500px;font-size: 22pt; text-align:center'/> </div>");
		
		var template = $("#gameDefinitionContentTemplate").clone();
		template.find("#gameTitle").remove();
		
		template.find(".pickTopicButton").clickExcl(function () {
			CompetitorModPublisher.pickTopicClick();
		});
		template.find("#pickGenreButton").clickExcl(function () {
			CompetitorModPublisher.pickGenreClick();
		});
		template.find("#pickSecondGenreButton").clickExcl(function () {
			UI.pickSecondGenreClick()
		});
		template.find(".pickPlatformButton").clickExcl(function () {
			CompetitorModPublisher.pickPlatformClick($(this))
		});
		if (GameManager.company.canDevelopMediumGames()) {
			if (!GameManager.company.canDevelopLargeGames())
				template.find(".gameSizeLarge").hide();
			if (!GameManager.company.canDevelopAAAGames())
				template.find(".gameSizeAAA").hide()
		} else
			template.find("#gameSizeGroup").hide();
		if (!GameManager.company.canDevelopMMOGames())
			template.find(".gameGenreMMO").hide();
		//if (!GameManager.company.canUseMultiGenre())
			template.find("#pickSecondGenreButton").hide();
		/*else {
			template.find("#pickSecondGenreButton").css("margin-left", "2.5px").css("margin-right", "2.5px").css("width", "145px");
			template.find("#pickGenreButton").css("margin-left",
				"2.5px").css("margin-right", "2.5px").css("width", "145px")
		}*/
		if (GameManager.company.canDevelopMultiPlatform())
			template.find(".pickPlatformButton").css("margin-left", "2.5px").css("margin-right", "2.5px").css("width", "145px");
		else
			template.find(".pickPlatformButton").slice(1).hide();
		if (!GameManager.company.canSetTargetAudience())
			template.find("#targetRating").hide();
			
		
		template.find(".pickEngineButtonWrapper").hide();
		template.find(".ratingLabel").hide();
		
		template.find(".gameDefSelection").clickExcl(function () {
			Sound.click();
			var e = $(this);
				e.parent().find(".gameDefSelection").removeClass("selected");
				e.addClass("selected");
		});
		
		$("#gameDefinition").find(".dialogNextButton").clickExcl(function () {
			$("#gameDefinition").find(".dialogNextButton").effect("shake", {
				times : 2,
				distance : 5
			}, 50)
		});
		var allGraphicTypeIds = Research.getAllItems().filter(function (f) {
				return f.group ===
				"graphic-type"
			}).map(function (f) {
				return f.id
			});
		$("#gameDefinition").find(".dialogBackButton").clickExcl(function () {
			Sound.click();
			UI._saveSelectedGameFeatureSettings(function (id) {
				return allGraphicTypeIds.indexOf(id) != -1
			});
			$("#gameDefinition").find(".dialogScreen1").transition({
				"margin-left" : 0
			});
			$("#gameDefinition").find(".dialogScreen2").transition({
				"margin-left" : "100%"
			})
		});
		
		//PrePay Value
		var PrePay = GameManager.company.cash * 0.05;
		template.append("<div style='font-size: 22pt'> Pre Pay Bonus: </div>")
		template.append("<div class='increasePrePay centeredButtonWrapper selectorButton windowStepActionButton' onClick='increasePrePay()' style='width:50px; display:inline-block; font-size:30pt;'> &#8657 </div>");
		template.append("<input id='moneyField' type='number' readonly='readonly' maxlength='35' value='" + PrePay + "' style='width:170px;font-size: 22pt'/>");
		template.append("<div class='decreasePrePay centeredButtonWrapper selectorButton windowStepActionButton' onClick='decreasePrePay()' style='width:50px; display:inline-block; font-size:30pt;'> &#8659 <br/> </div>");
		
		increasePrePay = function () {
			if(PrePay + 10000 <= GameManager.company.cash)
				PrePay += 10000;
				
			template.find("#moneyField").val(PrePay);
		}
		decreasePrePay = function () {
			if(PrePay - 10000 >= 0)
				PrePay -= 10000;
				
			template.find("#moneyField").val(PrePay);
		}
				
		//Royalty Slider
		template.append("<div style='font-size: 22pt'> Royalty Rate %: </div>");
		template.append("<div> <input id='royaltyField' type='number' readonly='readonly' maxlength='35' value='" + UI.getLongNumberString(10) + "' style='width:170px;font-size: 22pt'/> </div>")
		template.append("<div id='royaltySlider' style='margin-top:3px;'></div>")
		template.find("#royaltySlider").slider({
		min: 0,
		max: 100,
		range: "min",
		value: 10,
		step:1,
		animate: !1,
		slide: function (a, b) {
			var value = b.value;
			$("#royaltyField").val(UI.getLongNumberString(value));
		}});
		
		//Minimum Score
		var MinScore = 7;
		
		template.append("<div style='font-size: 22pt'> Minimum Score: </div>")
		template.append("<div class='increasePrePay centeredButtonWrapper selectorButton windowStepActionButton' onClick='increaseScore()' style='width:50px; display:inline-block; font-size:30pt;'> &#8657 </div>");
		template.append("<input id='scoreField' type='number' readonly='readonly' maxlength='35' value='" + MinScore + "' style='width:170px;font-size: 22pt'/>");
		template.append("<div class='decreasePrePay centeredButtonWrapper selectorButton windowStepActionButton' onClick='decreaseScore()' style='width:50px; display:inline-block; font-size:30pt;'> &#8659 <br/> </div>");
		
		increaseScore= function () {
			if(MinScore + 1 < 11)
				MinScore += 1;
				
			template.find("#scoreField").val(MinScore);
		}
		
		decreaseScore = function () {
			if(MinScore - 1 >= 1)
				MinScore -= 1;
				
			template.find("#scoreField").val(MinScore);
		}
		
		//Create Publisher Contract
		template.append("<div style='width:302px;margin:auto;'><div id='CompetitorModPublisherOKButton' class=' baseButton orangeButton windowLargeOkButton'>Create Publisher Contract</div></div>");
		template.find("#CompetitorModPublisherOKButton").clickExcl(function () {
			Sound.click();
			var success = CompetitorModPublisher.createContract();
			if(success == true){
				$("#CompetitorModPublisherContainer").dialog("close");
			}else{
				$("#CompetitorModPublisherOKButton").effect("shake", {
					times : 2,
					distance : 5
				}, 50)
			}
				
		});

		okClicked = false;
		PlatformShim.execUnsafeLocalFunction(function () {
			content.append(template);
			$("#CompetitorModPublisherContent").show();
			$("#CompetitorModPublisherTitle").show();
		});
	};
	
	CompetitorModPublisher.pickTopicClick = function (element) {
		Sound.click();
		var container = $("#CompetitorModPublisherTopicChooser");

		if (element) {
			var pickTopicButton = $("#CompetitorModPublisherContent").find(".pickTopicButton");
			var names = element.innerText.split("\n");
			pickTopicButton.get(0).innerText = names[0];
			pickTopicButton.removeClass("selectorButtonEmpty");
			
			$("#CompetitorModPublisherContent").show();
			$("#CompetitorModPublisherTitle").show();
			$("#CompetitorModPublisherTopicChooser").hide();
			return;
		}
		PlatformShim.execUnsafeLocalFunction(function () {
			var modal = $(".simplemodal-data");
			modal.find(".overlayTitle").text("Pick Topic".localize("heading"));
			container.empty();
			var activeTopicTemplate = '<div class="selectorButton whiteButton" onclick="CompetitorModPublisher.pickTopicClick(this)">{{name}}</div>';
			var lockedTopicTemplate = '<div class="selectorButton disabledButton">{{name}}</div>';
			var itemsPerRow = 3;
			var currentCount = 0;
			var row = 0;
			var researchVisibleCount = 0;
			var topics = General.getTopicOrder(GameManager.company);
			for (var i = 0; i < topics.length; i++) {
				var topic = topics[i];
				currentCount++;
				if (currentCount > itemsPerRow) {
					row++;
					currentCount = 1
				}
				var isAvailable = GameManager.company.topics.indexOf(topic) != -1;
				var isInResearch = GameManager.currentResearches.filter(function (f) {
						return f.topicId === topic.id
					}).length > 0;
				var isEnabled = isAvailable;
				var template = isEnabled ? activeTopicTemplate :
					lockedTopicTemplate;
				var isNameHidden = (!isEnabled && (!isAvailable && !isInResearch)) || !isEnabled;
				if (!isNameHidden)
					if (GameManager.areHintsEnabled() && Knowledge.hasTopicAudienceWeightingKnowledge(GameManager.company, topic)) {
						var enabledDisabledContent = !isEnabled ? " disabledButton" : '" onclick="CompetitorModPublisher.pickTopicClick(this)';
						var whiteButton = !isEnabled ? " " : " whiteButton ";
						var t = '<div class="selectorButton' + whiteButton + "pickTopicButtonAudienceHintVisible" + enabledDisabledContent + '"><span style="position:relative;top:5px;">{0}<span style="font-size:11pt;"><br/>{1}</span></span></div>';
						template = t.format(topic.name, Knowledge.getTopicAudienceHtml(GameManager.company, topic))
					} else
						template = template.replace("{{name}}", topic.name);
				else
					template = template.replace("{{name}}", "?");
				var element = $(template);
				element.css("position", "absolute");
				element.css("top", 50 * row + row * 10);
				element.css("left", (currentCount - 1) * 190 + 10);
				element.css("font-size", UI.pickTopicFontSize + "pt");
				container.append(element);
				if (!isAvailable && !isInResearch)
					researchVisibleCount++
			}
			modal.find(".selectionOverlayContainer").fadeIn("fast")
			
			$("#CompetitorModPublisherContent").hide();
			$("#CompetitorModPublisherTitle").hide();
			$("#CompetitorModPublisherTopicChooser").show();
		})
	};
	
	CompetitorModPublisher.pickGenreClick = function (element) {
		Sound.click();
		var container = $("#CompetitorModPublisherGenreChooser");

		if (element) {
			var pickGenreButton = $("#CompetitorModPublisherContent").find("#pickGenreButton");
			pickGenreButton.get(0).innerText = element.innerText;
			pickGenreButton.removeClass("selectorButtonEmpty");
			
			$("#CompetitorModPublisherContent").show();
			$("#CompetitorModPublisherTitle").show();
			$("#CompetitorModPublisherGenreChooser").hide();
			return
		}
		PlatformShim.execUnsafeLocalFunction(function () {
			var modal = $(".simplemodal-data");
			modal.find(".overlayTitle").text("Pick Genre".localize("heading"));
			container.empty();
			var template = '<div class="selectorButton" onclick="CompetitorModPublisher.pickGenreClick(this)">{{name}}</div>';
			var genres = General.getAvailableGenres(GameManager.company);
			//var second = modal.find("#pickSecondGenreButton").get(0).innerText;
			var topMarginAdded = false;
			for (var i = 0; i < genres.length; i++) {
				//if (second == genres[i].name)
				//	continue;
				var genre = genres[i];
				var element = $(template.replace("{{name}}", genre.name));
				element.css("margin-left", 210);
				if (!topMarginAdded) {
					element.css("margin-top", 90);
					topMarginAdded = true
				}
				element.addClass("whiteButton");
				container.append(element)
			}
			modal.find(".selectionOverlayContainer").fadeIn("fast")
			
			$("#CompetitorModPublisherContent").hide();
			$("#CompetitorModPublisherTitle").hide();
			$("#CompetitorModPublisherGenreChooser").show();
		})
	};
	
	CompetitorModPublisher.pickPlatformClick = function (platformName,platformId) {
		Sound.click();
		var container = $("#CompetitorModPublisherPlatformChooser");
		
		
		if (platformName && platformId) {
			var pickPlatformButton = $("#CompetitorModPublisherContent").find(".pickPlatformButton");
			pickPlatformButton.get(0).innerText = platformName;
			pickPlatformButton.removeClass("selectorButtonEmpty");
			
			$("#CompetitorModPublisherContent").show();
			$("#CompetitorModPublisherTitle").show();
			$("#CompetitorModPublisherPlatformChooser").hide();
			return;
		}
		
		
		PlatformShim.execUnsafeLocalFunction(function () {
			var modal =$(".simplemodal-data");
			modal.find(".overlayTitle").text("Pick Platform".localize("heading"));
			
			container.empty();
			var platforms = Platforms.getPlatformsOnMarket(GameManager.company);
			var game = GameManager.company.currentGame;

			platforms = platforms.slice().sort(function (a, b) {
					return Platforms.getTotalMarketSizePercent(b, GameManager.company) - Platforms.getTotalMarketSizePercent(a,
						GameManager.company)});
						
			for (var i = 0; i < platforms.length; i++) {
				var element =
					$("#platformButtonTemplate").clone();
				element.removeAttr("id");
				var platform = platforms[i];
				element.platformId = platform.id;
				element.platformName = platform.name;
				var isEnabled = GameManager.company.licencedPlatforms.indexOf(platform) != -1;
				element.find(".platformButtonImage").attr("src", Platforms.getPlatformImage(platform, GameManager.company.currentWeek));
				element.find(".platformTitle").text(platform.name);
				element.find(".cost").text("Dev. cost: ".localize() + UI.getShortNumberString(platform.developmentCosts));
				if (!isEnabled) {
					element.find(".licenseCost").text("License cost: ".localize() +
						UI.getShortNumberString(platform.licencePrize));
					if (GameManager.company.cash < platform.licencePrize)
						element.find(".licenseCost").addClass("red")
				} else
					element.find(".licenseCost").hide();
				element.find(".marketShare").text("Market share: ".localize() + UI.getPercentNumberString(Platforms.getTotalMarketSizePercent(platform, GameManager.company)));
				if (GameManager.areHintsEnabled()) {
					var content = Knowledge.getPlatformAudienceHintHtml(GameManager.company, platform);
					if (content)
						element.find(".audienceHints").html(content);
					var content = Knowledge.getPlatformGenreHintHtml(GameManager.company, platform);
					if (content)
						element.find(".genreHints").html(content)
				}
				(function (element) {
					if (isEnabled) {
						element.addClass("whiteButton");
						element.on("click", function () {
							CompetitorModPublisher.pickPlatformClick(element.platformName,element.platformId)
						})
					} else if (platform.licencePrize <= GameManager.company.cash) {
						element.addClass("whiteButton");
						element.on("click", function () {
							var that = this;
							UI.buyPlatform($(that).find(".platformTitle").get(0).innerText, function (e) {
								if (e)
									CompetitorModPublisher.pickPlatformClick(element.platformName,element.platformId)
							})
						})
					} else
						element.addClass("disabledButton")
				})(element);
				container.append(element)
			}
			modal.find(".selectionOverlayContainer").fadeIn("fast")
			
			$("#CompetitorModPublisherContent").hide();
			$("#CompetitorModPublisherTitle").hide();
			$("#CompetitorModPublisherPlatformChooser").show();
		})
	};

	var getTargetAudience = function (audience) {
		var modalContent = $("#CompetitorModPublisherContent");
		var selectedRating = modalContent.find(".rating.selected");;
		
		if (selectedRating.hasClass("ratingY"))
			return "young";
		else if (selectedRating.hasClass("ratingE"))
			return "everyone";
		else if (selectedRating.hasClass("ratingM"))
			return "mature";
		return "everyone"
	};

	var getGameSize = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var selectedSize = modalContent.find(".gameSizeButton.selected");;
		
		if (selectedSize.hasClass("gameSizeSmall"))
			return "small";
		else if (selectedSize.hasClass("gameSizeMedium"))
			return "medium";
		else if (selectedSize.hasClass("gameSizeLarge"))
			return "large";
		else if (selectedSize.hasClass("gameSizeAAA"))
			return "aaa";
		return "small"
	};

	var getContractName = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var contractName = modalContent.find("#contractNameInput").val();
		return contractName
	};

	var getSelectedTopic = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var topicName = modalContent.find(".pickTopicButton").text();
		var topic = GameManager.company.topics.first(function (t) {
				return t.name == topicName
			});
		return topic
	};

	var getSelectedGenre = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var genreName = modalContent.find("#pickGenreButton").text();
		var genre = GameGenre.getAll().first(function (i) {
				return i.name == genreName
			});
		return genre
	};

	var getSelectedPlatform = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var platformName = modalContent.find("#pickPlatformButton").text();
		var platform = GameManager.company.licencedPlatforms.first(function (i) {
				return i.name.trim() == platformName.trim()
			});
		return platform
	};

	var getRoyaltyRate = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var royaltyRate = modalContent.find("#royaltyField").val();
		return royaltyRate
	};

	var getPrePay = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var royaltyRate = modalContent.find("#moneyField").val();
		return royaltyRate
	};
	
	var getMinScore = function () {
		var modalContent = $("#CompetitorModPublisherContent");
		var minScore = modalContent.find("#scoreField").val();
		return minScore
	};
	
	CompetitorModPublisher.createContract = function () {
		var contract = new PublisherContract();
		var contractName = getContractName();
		var topic = getSelectedTopic();
		var genre = getSelectedGenre();
		var platform = getSelectedPlatform();
		var targetAudience = getTargetAudience();
		var gameSize = getGameSize();
		var royaltyRate = getRoyaltyRate();
		var prePayBonus = getPrePay();
		var minScore = getMinScore();
		
		if(contractName == null || topic == null || genre == null || platform == null)
			return null;
		
		contract.name = contractName;
		contract.score = 1;
		contract.gameSize = gameSize;
		contract.genre = genre;
		contract.topic = topic;
		contract.targetAudience = targetAudience;
		contract.platforms.push(platform);
		contract.royalty = royaltyRate;
		contract.penaltyFee = prePayBonus * 0.60;
		contract.preBonus = prePayBonus;
		contract.active = true;
		contract.minScore = minScore;
		
		GameManager.company.cash -= contract.preBonus;
		CompetitorModPublisher.contracts.push(contract);
	};
})();