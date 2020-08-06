$(document).ready(function() {

	const remote = require('electron').remote;
	const ipc = require('electron').ipcRenderer;
	const fs = require('fs');

	$('#close').on('click', function() {
       var window = remote.getCurrentWindow();
       window.close();
	});

	var config = JSON.parse(fs.readFileSync('config.json').toString());
	
	if(config.playerID === undefined || config.playerID == '' || config.playerID == 'YOUR_STEAMID3') {
		$('#status').html('Player ID not configured in <strong>options.json</strong>.');
		return;
	}

	var firstRun = true;

	$('#reload').on('click', function() {
		clearInterval(timer);
		$('#timer').text('Refreshing');
	    loadServer();				            
	});

	function pad(num, size) {
		var s = num + '';
		while (s.length < size) s = '0' + s;
		return s;
	}				

	let timer;

	function startCountdown() {

		var duration = 60 * 5;
		timer = setInterval(function() {

			minutes = parseInt(duration / 60, 10);
			seconds = parseInt(duration % 60, 10);

	        minutes = minutes < 10 ? '0' + minutes : minutes;
	        seconds = seconds < 10 ? '0' + seconds : seconds;

	        $('#timer').text(minutes + ':' + seconds);

	        if (--duration < 0) {
	        	$('#timer').text('Refreshing');
	        	loadServer();
	            clearInterval(timer);
	        }


		}, 1000);

	}				
	
	async function loadServer() {

		clearInterval(timer);
		var times = {};

		var player;
		await new Promise(done => $.getJSON('https://surfheaven.eu/api/playerinfo/' + config.playerID, async function(data) {
			player = data[0];
			done();
		}))

		if(player === undefined || player.length == 0) {
			$('#status').html('Player not found or connection failed.<br/><br/>Make sure <strong>options.json</strong> is configured correctly and relaunch the app.');
			return;
		}

		$.when(
			$.getJSON('https://surfheaven.eu/api/records/' + config.playerID), 
			$.getJSON('https://surfheaven.eu/api/vip/' + config.playerID), 
			$.getJSON('https://surfheaven.eu/api/servers')
		).done(async function(records, vipStatus, servers) {

			var mapBestTimes = {};
			var vip = Boolean(vipStatus[0][0].vip);

			for(var i in records[0]) {

				var map = records[0][i];

				if(mapBestTimes[map.map] == undefined) mapBestTimes[map.map] = { time: 0, rank: 0, bonuses: {} };
				
				if(map.track == 0) {
					var time = (map.time).toString().split('.');

					var minutes = pad(Math.floor(parseInt(time[0]) / 60), 2);
					var seconds = pad((parseInt(time[0]) - minutes * 60), 2);
					var milli = (Math.round(parseFloat('0.' + time[1]) * 1000) / 1000).toString().replace('0.', '');

					var formatedTime = minutes + ':' + seconds + '.' + milli;

					mapBestTimes[map.map].time = formatedTime;
					mapBestTimes[map.map].rank = map.rank;
				} else {
					mapBestTimes[map.map].bonuses[map.track] = map.time;
				}					

			}

			$('#stats').html('Rank ' + player.rank + ' &middot; ' + player.rankname + ' &middot; ' + player.points + ' points');

			var toShow = (vip || player.rank <= 500 || config.forceShowAllServers) ? 6 : 3;

			for(var i = 0; i <= toShow; i++) {

				var server = servers[0][i];
				var mapInfo;
				await new Promise(done => $.getJSON('https://surfheaven.eu/api/mapinfo/' + server.map, async function(data) {
					mapInfo = data[0];
					done();
				}));

				var completedBonuses = (mapBestTimes[server.map] !== undefined) ? Object.keys(mapBestTimes[server.map].bonuses).length : 0;
				
				$('#temp').append('<tr></tr>');
				$('#temp tr:last-child').append('<td style="width:130px;">'+ (server.name).replace('SurfHeaven ', '') +'</td>');
				$('#temp tr:last-child').append('<td>'+ server.map +'  &middot; <span style="opacity:.8">'+ mapInfo.tier +'</span></td>');
				$('#temp tr:last-child').append('<td style="width:130px;">'+((mapBestTimes[server.map] !== undefined && mapBestTimes[server.map].time != 0) ? '#' + mapBestTimes[server.map]['rank'] + ' / ' + mapBestTimes[server.map]['time'] : '')+'</td>');
				$('#temp tr:last-child').append('<td style="width:55px;">'+ completedBonuses +' / '+mapInfo.bonus+'</td>');
				$('#temp tr:last-child').append('<td style="width:55px;">'+ server.playercount +'/'+ server.maxplayers +'</td>');
				$('#temp tr:last-child').append('<td style="width:95px;"><a href="steam://connect/'+ server.ip +'">Connect</a></td>');

			}

			$('#status').hide();

			$('#data').html($('#temp').html());
			$('#temp').html('');


			if(firstRun) {
				ipc.send('height', document.body.scrollHeight);
				firstRun = false;
			}


			startCountdown();

		}).fail(function() {
			$('#status').text('Connection failed.');
		});


	}
	loadServer();
});	