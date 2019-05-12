CompetitorActions = {};
(function () {
    CompetitorActions.createAction = function (name, duration) {
        return new Action(name, duration);
    };

    var Action = function (name, duration) {
        this.name = name;
        this.startWeek = Math.floor(GameManager.company.currentWeek);
        this.duration = duration;
        this.deadline = this.startWeek + duration;

        this.tick = function (competitor) {
            switch (this.name) {
                case "Game Creation":
                    GameCreationTick(competitor, this);
                    break;
            }
        };

        this.finish = function (competitor) {
            switch (this.name) {
                case "Game Creation":
                    GameCreationFinish(competitor);
                    break;
                case "Game Report":
                    GameReport(competitor);
                    break;
                case "Research Topic":
                    ResearchTopic(competitor);
                    break;
            }
        };

        this.save = function () {
            var data = {};
            data["name"] = this.name;
            data["startWeek"] = this.startWeek;
            data["duration"] = this.duration;
            data["deadline"] = this.deadline;
            return data;
        };
    };

    CompetitorActions.load = function (data) {
        if (data) {
            var action = new Action();
            action.name = data["name"];
            action.startWeek = data["startWeek"];
            action.duration = data["duration"];
            action.deadline = data["deadline"];
            return action;
        }
        return undefined
    };

    //Process the game creation of a competitor
    var GameCreationTick = function (competitor, action) {
        var categories = [
            ["Gameplay", "Engine", "Story/Quest"],
            ["Dialogs", "Level Design", "AI"],
            ["World Design", "Graphic", "Sound"]
        ];

        var timePassed = GameManager.company.currentWeek - action.startWeek;
        var stage = Math.ceil(timePassed / (action.duration / 3));
        var stageDeadline = Math.floor((action.duration / 3) * stage);

        if (timePassed >= stageDeadline) {
            var stageCats = categories[stage - 1];
            var stageFeatures = getTopFeatures().filter(function (f) { return stageCats.indexOf(f.category) > -1 });
            var stageSum = 0;

            for (f = 0; f < stageFeatures.length; f++)
                stageSum += Research.getDevCost(stageFeatures[f]);

            var stageCost = Math.round(stageSum * GameManager.company.getRandom().clamp(0.6, 0.9));
            //competitor.logMessage("Cost for Stage {0} is: {1}".format(stage, stageCost));
            competitor.currentGame.costs += stageCost;
            competitor.cash -= stageCost;
        }
    };

    //Finish the game creation of a competitor
    var GameCreationFinish = function (competitor) {
        var game = competitor.currentGame;
        game.releaseWeek = Math.floor(GameManager.company.currentWeek) + 1;
        competitor.gameLog.push(game);
        competitor.gameOnMarket = game;

        var review = "good";
        if (game.score <= 4)
            review = "really bad";
        else if (game.score <= 5)
            review = "pretty bad";
        else if (game.score <= 6)
            review = "okay"
        else if (game.score <= 7)
            review = "favorable";
        else if (game.score <= 8)
            review = "very good";
        else if (game.score <= 9)
            review = "great";
        else if (game.score < 10)
            review = "almost perfect";
        else if (game.score >= 10)
            review = "perfect";

        var msg = "Our competitor {0} just released a new game called {1}. The topic of the game appears to be: {2} and got {3} reviews.".format(competitor.name, game.name, game.topic.name, review).localize();
        GameManager.company.notifications.push(new Notification({
            header: competitor.name.localize(),
            text: msg.localize()
        }));

        competitor.currentGame = null;
    };

    //Generate a Game Report for the last game of a competitor
    //There is a 70% chance for the competitor to discover a combination
    var GameReport = function (competitor) {
        var game = competitor.gameLog.last();

        //Potentially add the topic/genre combo to the knowledge base
        if (GameManager.company.getRandom() > 0.3)
            if (competitor.exactKnowledge.first(function (i) { return i.topicId == game.topic.id && i.genreId == game.genre.id }) == null)
                competitor.exactKnowledge.push({
                    "topicId": game.topic.id,
                    "genreId": game.genre.id,
                    "match": GameGenre.getGenreWeighting(game.topic.genreWeightings, game.genre)
                });

        //Potentially add the platform/genre combo to the knowledge base
        if (GameManager.company.getRandom() > 0.3)
            if (competitor.exactKnowledge.first(function (i) { return i.platformId == game.platform.id && i.genreId == game.genre.id }) == null)
                competitor.exactKnowledge.push({
                    "platformId": game.platform.id,
                    "genreId": game.genre.id,
                    "match": Platforms.getGenreWeighting(game.platform.id, game.genre.id)
                });

        competitor.gameLog.last().gameReport = true;
    };

    //Research a topic for a competitor
    var ResearchTopic = function (competitor) {
        competitor.addNewTopic();
    };

    //Select the best features available to the player
    var getTopFeatures = function () {
        var topFeatures = [];
        var allFeatures = GameManager.getAvailableGameFeatures(GameManager.company.engines.last());
        for (f = 0; f < allFeatures.length; f++) {
            var feature = allFeatures[f];
            if (!topFeatures.some(function (item) { return item.group == feature.group })) {
                topFeatures.push(feature);
            } else if (topFeatures.some(function (item) { return item.group == feature.group && item.v < feature.v })) {
                var idx = topFeatures.indexOf(topFeatures.first(function (item) { return item.group == feature.group }));
                topFeatures[idx] = feature;
            }
        }
        return topFeatures;
    };
})();