$(document).ready(async function() {

	const remote = require('electron').remote;
	const ipc = require('electron').ipcRenderer;
	const fs = require('fs');

	const configFile = 'config.json';

	var config = JSON.parse(fs.readFileSync(configFile).toString());
	var firstRun = true;
	var timer;

	function saveSettings(file, json) {
		fs.writeFileSync(file, JSON.stringify(json));
	}

	$('#close').on('click', function() {
		var window = remote.getCurrentWindow();
		window.close();
	});


	$(document).on('click', '#toggleOptions, .optionsLink', function() {
		$('#container').toggleClass('showOptions');
	})

	$(document).on('click', '#data .star', function() {
		$(this).parent().toggleClass('active');

		if($(this).parent().hasClass('active')) {
			config.favourites.push($(this).parent().find('.map').text());
		} else {
			config.favourites.splice(config.favourites.indexOf($(this).parent().find('.map').text()), 1);
		}

		saveSettings(configFile, config);

	})

	$('#saveSettings').on('click', function() {

		var optionList = $('#options input');

		for(var i=0; i < optionList.length; i++) {

			if($(optionList[i]).attr('type') == 'checkbox') {
				config[$(optionList[i]).attr('name')] = $(optionList[i]).is(':checked');
			} else {
				config[$(optionList[i]).attr('name')] = $(optionList[i]).val();
			}		
			
		}

		saveSettings(configFile, config);

		firstRun = true;

		$('#data').html('');	
		$('#container').removeClass('showOptions');
		initialLoad();
	})

	$('#reload').on('click', function() {
		clearInterval(timer);
		$('#timer').text('Refreshing');
		loadServers();				            
	});

	async function initialLoad() {


		$('#status').show().html('Loading ..');		

		if(config.forceShowAllServers) {
			$('input[name="forceShowAllServers"]').attr('checked', 'checked');
		}

		if(config.playerID == null) {

			$('#status').html('Trying to retrieve your steamid3 id.');

			var receivedPlayerID;
			await new Promise(done => $.getJSON('https://surfheaven.eu/api/id', async function(data) {
				receivedPlayerID = data[0];
				done();
			}));

			if(receivedPlayerID.steamid !== undefined) {
				config.playerID = receivedPlayerID.steamid;
				saveSettings(configFile, config);
			}
		}
		
		if(config.playerID === undefined || config.playerID == '' || config.playerID == 'YOUR_STEAMID3' || config.playerID == null) {
			$('#status').html('Player ID not found. Add it in the <span class="optionsLink">options</span>.');
			return;
		}

		$('input[name="playerID"]').val(config.playerID);	
		loadServers();	
	}

	initialLoad();


	function pad(num, size) {
		var s = num + '';
		while (s.length < size) s = '0' + s;
		return s;
	}				


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
	        	loadServers();
	            clearInterval(timer);
	        }


		}, 1000);

	}				
	
	async function loadServers() {

		clearInterval(timer);
		var times = {};

		var player;
		await new Promise(done => $.getJSON('https://surfheaven.eu/api/playerinfo/' + config.playerID, async function(data) {
			player = data[0];
			done();
		}))

		if(player === undefined || player.length == 0) {
			$('#status').html('Player not found or connection failed.<br/><br/>Make sure the correct ID is set in <span class="optionsLink">options</span>.');
			return;
		}

		$.when(
			$.getJSON('https://surfheaven.eu/api/records/' + config.playerID), 
			$.getJSON('https://surfheaven.eu/api/servers')
		).done(async function(records, servers) {

			var mapBestTimes = {};

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

			var toShow = (Boolean(player.vip) || player.rank <= 500 || config.forceShowAllServers) ? 6 : 3;

			for(var i = 0; i <= toShow; i++) {

				var server = servers[0][i];
				var mapInfo;
				await new Promise(done => $.getJSON('https://surfheaven.eu/api/mapinfo/' + server.map, async function(data) {
					mapInfo = data[0];
					done();
				}));

				var completedBonuses = (mapBestTimes[server.map] !== undefined) ? Object.keys(mapBestTimes[server.map].bonuses).length : 0;
				
				$('#temp').append('<tr></tr>');
				$('#temp tr:last-child').append('<td style="width:135px;">'+ (server.name).replace('SurfHeaven ', '') +'</td>');
				$('#temp tr:last-child').append('<td'+ ((config.favourites.includes(server.map)) ? ' class="active"' : '') +'><span class="map">'+ server.map +'</span>  &middot; <span style="opacity:.8">'+ mapInfo.tier +'</span> &middot; <span style="opacity:.8">'+ ((mapInfo.type == 1) ? 'S' : 'L') +'</span> <span class="star"><i class="icon icon-star" style="font-size:14px;"></i></span></td>');
				$('#temp tr:last-child').append('<td style="width:130px;">'+((mapBestTimes[server.map] !== undefined && mapBestTimes[server.map].time != 0) ? '#' + mapBestTimes[server.map]['rank'] + ' / ' + mapBestTimes[server.map]['time'] : '')+'</td>');
				$('#temp tr:last-child').append('<td style="width:55px;">'+ completedBonuses +' / '+mapInfo.bonus+'</td>');
				$('#temp tr:last-child').append('<td style="width:55px;">'+ server.playercount +'/'+ server.maxplayers +'</td>');
				$('#temp tr:last-child').append('<td style="width:95px;"><a href="steam://connect/'+ server.ip +'">Connect</a></td>');

			}

			$('#status').hide();

			$('#data').html($('#temp').html());
			$('#temp').html('');


			if(firstRun) {
				ipc.send('height', $('#data').height()+34);
				firstRun = false;
			}


			startCountdown();

		}).fail(function() {
			$('#status').text('Connection failed.');
		});


	}
	
});	