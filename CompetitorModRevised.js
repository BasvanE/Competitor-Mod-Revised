(function () {
	var ready = function () {
		CompetitorMod.init();
	};

	var error = function () {
	};

	GDT.loadJs(
	['source/CompetitorActions.js',
	'source/CompetitorSales.js',
	'source/CompetitorGameLib.js',
	'source/CompetitorLib.js',
	'source/CompetitorUI.js',
	'source/NameGeneration.js',
	'source/source.js'], ready, error);
})();