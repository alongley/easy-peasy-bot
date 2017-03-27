/**
 * A Bot for Slack!
 */

var request = require('request');

/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    //	console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    //process.exit(1);
    var app = require('./lib/apps');
    var controller = app.configure(7177, '27793887239.152777161559', '2ea3424c0397106aebb2613eb902006a', config, onInstallation);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears(['hello', 'hi', 'greetings'],
	    ['direct_mention', 'mention', 'direct_message'], 
	    function (bot, message) {
	bot.api.users.info({user: message.user}, function(err, user) {
    	if (user && user.ok) {
    	    controller.storage.users.get(message.user,function(err, lsuser) {
    	        lsuser.email = user.user.profile.email;
    	        lsuser.color = user.user.color;
    	        lsuser.first_name = user.user.profile.first_name;
    	        controller.storage.users.save(lsuser);
    	    });

    		bot.reply(message, 'Hi ' + user.user.profile.first_name + ', what would you like to do in regards to time off?');
    		bot.reply(message, {
    	        attachments:[
    	            {
    	                title: 'Please select an option',
    	                callback_id: '123',
    	                attachment_type: 'default',
    	                actions: [
    	                    {
    	                        "name":"balance",
    	                        "text": "See Balances",
    	                        "value": "balance",
    	                        "type": "button",
    	                    },
    	                    {
    	                        "name":"schedule",
    	                        "text": "Request time off",
    	                        "value": "schedule",
    	                        "type": "button",
    	                    },
    	                    {
    	                        "name":"history",
    	                        "text": "View History",
    	                        "value": "history",
    	                        "type": "button",
    	                    }
    	                ]
    	            }
    	        ]
    	    });
    	}
    	else {
    		bot.reply(message, 'I\'m sorry, I can\'t seem to find out who you are! You\'ll need to logon to TriNet to get that information.');
    	}
    });
	
});

controller.hears(['t','timeoff hours','time off hours','timeoff balance','time off balance','vacation','vacay','vacation balance','timeoff','time off'], 
		'direct_message', function (bot, message) {
    bot.api.users.info({user: message.user}, function(err, user) {
    	if (user && user.ok) {
    		var email = user.user.profile.email;
    		bot.reply(message, 'Ok, ' + user.user.profile.first_name + ', timeoff balance. Let me get that for you. Give me a minute.');
    		getHours(bot, message, email);
    	}
    	else {
    		bot.reply(message, 'I\'m sorry, I can\'t seem to find out who you are! You\'ll need to logon to TriNet to get that information.');
    	}
    });
});

controller.hears(['bye', 'goodbye', 'later', 'cya', 'see ya', 'see ya later'], 
		'direct_message', function (bot, message) {
    bot.reply(message, 'Later!');
});

controller.hears(['raise', 'give me a raise', 'money', 'mo money', 'give me money'], 
		'direct_message', function (bot, message) {
    bot.reply(message, 'Alright there hold your horses. You\'ll have to brown nose your boss the old-fashioned way to get a raise!');
});

controller.hears(['request time off', 'request', 'request timeoff', 'timeoff request', 'time off request'], 
		'direct_message', function (bot, message) {
    bot.reply(message, 'Alright there hold your horses. I haven\'t been programmed to do that yet! Coming soon!');
});

controller.hears(['no', 'nope', 'n'], 
		'direct_message', function (bot, message) {
    bot.reply(message, 'Alright boss, until next time!');
});

controller.hears(['yes', 'y'], 
		'direct_message', function (bot, message) {
    bot.reply(message, 'What can I do for you? So far you can ask me how many ' +
    		'hours you have in your time off bank. Say \'timeoff hours\'.');
});

controller.on('interactive_message_callback', function(bot, message) {
	console.log('interactive message callback');
	
	var action = message.actions[0].value;  // balance, schedule, history
	var callback_id = message.callback_id;  // from the earlier message attachments
	var userId = message.user;
	var response_url = message.response_url;
	var token = message.token;
	var res = bot.res;
	
	controller.storage.users.get(userId,function(err, user) {
        if (user && user.email) {
        	var message = {
            		"attachments": []
            };
        	var email = user.email;
        	var first_name = user.first_name;
        	
        	if (action == 'balance') {
        		message.text = 'Checking balances. Give me a minute.';
        	} else if (action == 'schedule') {
        		message.text = 'Ok, you want some time off. What type?';
        	} else if (action == 'history') {
        		message.text = 'Checking history. Give me a minute.';
        	} else {
        		message.text = "I'm sorry, I don't understand. You requested action " + action + ". I don't know what that means.";
        	}
        	sendMessageToSlackResponseURL(response_url, message);

        	if (action == 'balance') {
        		getHours(response_url, message, email, first_name);
        	} else if (action == 'schedule') {
        		
        	} else if (action == 'history') {
        		
        	} else {
        		
        	}
        	
        	var reply = {
        		    "text": "Would you like to play a game?",
        		    "attachments": [
        		        {
        		            "text": "Choose a game to play",
        		            "fallback": "You are unable to choose a game",
        		            "callback_id": "wopr_game",
        		            "color": "#3AA3E3",
        		            "attachment_type": "default",
        		            "actions": [
        		                {
        		                    "name": "game",
        		                    "text": "Chess",
        		                    "type": "button",
        		                    "value": "chess"
        		                },
        		                {
        		                    "name": "game",
        		                    "text": "Falken's Maze",
        		                    "type": "button",
        		                    "value": "maze"
        		                },
        		                {
        		                    "name": "game",
        		                    "text": "Thermonuclear War",
        		                    "style": "danger",
        		                    "type": "button",
        		                    "value": "war",
        		                    "confirm": {
        		                        "title": "Are you sure?",
        		                        "text": "Wouldn't you prefer a good game of chess?",
        		                        "ok_text": "Yes",
        		                        "dismiss_text": "No"
        		                    }
        		                }
        		            ]
        		        }
        		    ]
        		};
        	bot.replyInteractive(message, reply);
        	
        } else {
            bot.reply(message,'I don\'t know who you are!');
        }
    });
	

});

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});

function sendMessageToSlackResponseURL(responseURL, JSONmessage){
    var postOptions = {
        uri: responseURL,
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        json: JSONmessage
    }
    request(postOptions, function(error, response, body) {
        if (error){
            // handle errors as you see fit
        }
    });
}

//function getHours(bot, message, email) {
function getHours(response_url, message, email, first_name) {
	var outgoingApiEnabled = true;
	
	if (outgoingApiEnabled) {
	    var soap = require('strong-soap').soap;
	    var url = 'http://sandbox.openair.com/wsdl.pl?wsdl';
	    var localWsdlFile = "/openair.sandbox.wsdl";
	    var serverName = "the OpenAir Sandbox";
	    
	    console.log('Checking hours for ' + email);
	
	    var loginRequest = {p: {api_namespace: 'default', api_key: '8VclqMUlABXN2DxbiNGb', 
			company: 'Precocity, LLC', user: 'activecollab', password: '@wzPl11baQv5', 
			client: 'precocity node client', version: '1.0'}};
	    
	    if (true) {
	    	url = 'https://www.openair.com/wsdl.pl?wsdl';
	    	serverName = "OpenAir (Production)";
	    	localWsdlFile = "/openair.wsdl";
	    	loginRequest = {p: {api_namespace: 'default', api_key: 'L0elADycIOCOnpSVLJM9', 
	    		company: 'precocity', user: 'activecollab', password: '@wzPl11baQv5', 
	    		client: 'precocity node client', version: '1.0'}};
	    }
	    
	    var timesheetRequest = {method: {$attributes: {'soapenc:arrayType' : 'prl:ReadRequest[]'}, method: {method: 'all', attributes: {$attributes: {'soapenc:arrayType' : 'prl:Attribute[]'}, attributes: {name: 'limit', value: '100'}}, type: 'Timesheet'} } };
	    var userRequest = {method: {$attributes: {'soapenc:arrayType' : 'prl:ReadRequest[]'}, method: {method: 'equal to', attributes: {$attributes: {'soapenc:arrayType' : 'prl:Attribute[]'}, attributes: {name: 'limit', value: '100'}}, type: 'User', objects: {$attributes: {'soapenc:arrayType' : 'prl:oaBase[]'}, objects: {$attributes: {'xsi:type' : 'prl:oaUser'}, addr_email: email} } } } };
	
	//    soap.createClient(__dirname + localWsdlFile, clientOptions, function(err,client) {
	   	soap.createClient(url, function(err,client) {
	//   		var description = client.describe();
	//   		console.log(JSON.stringify(description.OAirServiceHandlerService.OAirService.read));
	   		var login = client['OAirServiceHandlerService']['OAirService']['login'];
	    	login(loginRequest, function(err, result, envelope, soapHeader) {
	    		if (err) {
				    //bot.reply(message, 'Hm, ' + serverName + ' seems to be down right now. Check back with me later.');
				    //bot.reply(message, 'Anything else I can help you with today?');
				    
				    sendMessageToSlackResponseURL(response_url, {
				    	text: 'Hm, ' + serverName + ' seems to be down right now. Check back with me later.',
				        attachments:[
				            {
				                title: 'Anything else I can help you with today ' + first_name + '?',
				                callback_id: '123',
				                attachment_type: 'default',
				                actions: [
				                    {
				                        "name":"yes",
				                        "text": "Yes",
				                        "value": "yes",
				                        "type": "button",
				                    },
				                    {
				                        "name":"no",
				                        "text": "No",
				                        "value": "no",
				                        "type": "button",
				                    }
				                ]
				            }
				        ]
				    });
				    
	    		} else if (result.loginReturn) {
	    			console.log('Logged into OpenAir ok');
		    		var sessionId = result.loginReturn.sessionId['$value'];
		    		var sessionHeader = {SessionHeader: {sessionId: sessionId} };
		    		client.addSoapHeader(sessionHeader);
		    		var logout = client['OAirServiceHandlerService']['OAirService']['logout'];
		    		var read = client['OAirServiceHandlerService']['OAirService']['read'];
	
		    		read(userRequest, function(err, result, envelope, soapHeader) {
		    			var userId;
		    			try {
		    				var items = result.Array.ReadResult.objects.item;
		    				if (items.constructor === Array) {
		    					userId = items[0].id.$value;
		    				} else {
		    					userId = result.Array.ReadResult.objects.item.id.$value;
		    				}
		    			} catch (e) {}
	
		    			if (err || !userId) {
		    			    //bot.reply(message, 'Drats! I can\'t seem to find your information! Is your email \'' + email + '\'?');
		    			    
						    sendMessageToSlackResponseURL(response_url, {
						    	text: 'Drats! I can\'t seem to find your information, ' + first_name + '! Is your email \'' + email + '\'?',
						        attachments:[
						            {
						                title: 'Anything else I can help you with today?',
						                callback_id: '123',
						                attachment_type: 'default',
						                actions: [
						                    {
						                        "name":"yes",
						                        "text": "Yes",
						                        "value": "yes",
						                        "type": "button",
						                    },
						                    {
						                        "name":"no",
						                        "text": "No",
						                        "value": "no",
						                        "type": "button",
						                    }
						                ]
						            }
						        ]
						    });
		    			    
				    		logout({}, function(err, result, envelope, soapHeader) {
				    			console.log(result);
				    			console.log(envelope);
				    		});
		        		} else {
		        			console.log('Got an OpenAir user ok');
			    		    var accrualRequest = {method: {$attributes: {'soapenc:arrayType' : 'prl:ReadRequest[]'}, method: {method: 'equal to', attributes: {$attributes: {'soapenc:arrayType' : 'prl:Attribute[]'}, attributes: {name: 'limit', value: '100'}}, type: 'Leave_accrual_transaction', objects: {$attributes: {'soapenc:arrayType' : 'prl:oaBase[]'}, objects: {$attributes: {'xsi:type' : 'prl:oaLeave_accrual_transaction'}, userid: userId} } } } };
		
				    		read(accrualRequest, function(err, result, envelope, soapHeader) {
				        		if (err) {
				    			    //bot.reply(message, 'Hm, ' + serverName + ' is not understanding what I mean by trying to get your leave accrual transactions.');
				    			    //bot.reply(message, 'Anything else I can help you with today?');
				        			
				        			sendMessageToSlackResponseURL(response_url, {
								    	text: 'Hm, ' + serverName + ' is not understanding what I mean by trying to get your leave accrual transactions, ' + first_name + '.',
								        attachments:[
								            {
								                title: 'Anything else I can help you with today, ' + first_name + '?',
								                callback_id: '123',
								                attachment_type: 'default',
								                actions: [
								                    {
								                        "name":"yes",
								                        "text": "Yes",
								                        "value": "yes",
								                        "type": "button",
								                    },
								                    {
								                        "name":"no",
								                        "text": "No",
								                        "value": "no",
								                        "type": "button",
								                    }
								                ]
								            }
								        ]
								    });
				        		} else {
				    			//console.log(result);
				    			//console.log(envelope);
				    			//console.log(client.lastRequest);
					        		try {
						    			var items = result.Array.ReadResult.objects.item;
						    			var buckets = {};
						    			
						    	        for (var i = 0, n = items.length; i < n; i++) {
						    	            var item = items[i];
						    	            
						    	            try {
						    	            	var amount = parseFloat(item.amount.$value);
						    	            	var type = item.notes.$value;
						    	            	
						    	            	if (type == "Three Week Preferred PTO" || type == "Two Weeks Standard") {
						    	            		type = "PTO";
						    	            	}
						    	            	
							    	            if (buckets.hasOwnProperty(type)) {
							    	            	buckets[type] += amount;
							    	            } else {
							    	            	buckets[type] = amount;
							    	            }
						    	            } catch (err) {}
						    	        }
						    	        
						    	        var msg = 'Hi ' + first_name + ', you have the following balances as of today: ';
						    	        var i = 0, len = 0;
						    	        
						    	        for (var key in buckets) {
						    	        	len++;
						    	        }
	
						    	        console.log('Got ' + len + ' buckets of accrual from OpenAir ok');
	
						    	        for (var key in buckets) {
						    	        	msg += key + ': ' + buckets[key] + ' hours';
						    	        	i++;
						    	        	if (i < len-1) { msg += ', ';} else if (i < len) { msg += ' and '; } else {msg += '.';}
						    	        }
				    
									    //bot.reply(message, msg);
									    //bot.reply(message, 'Anything else I can help you with today?');
									    
					        			sendMessageToSlackResponseURL(response_url, {
									    	text: msg,
									        attachments:[
									            {
									                title: 'Anything else I can help you with today, ' + first_name + '?',
									                callback_id: '123',
									                attachment_type: 'default',
									                actions: [
									                    {
									                        "name":"yes",
									                        "text": "Yes",
									                        "value": "yes",
									                        "type": "button",
									                    },
									                    {
									                        "name":"no",
									                        "text": "No",
									                        "value": "no",
									                        "type": "button",
									                    }
									                ]
									            }
									        ]
									    });
					        		} catch (err) {
					        			//bot.reply(message, 'I\'m sorry, I can\'t figure out what ' + serverName + ' is trying to tell me about your leave accrual transactions. It\'s Greek to me.');
					        			//bot.reply(message, 'Anything else I can help you with today?');
					        			
					        			sendMessageToSlackResponseURL(response_url, {
									    	text: 'I\'m sorry, I can\'t figure out what ' + serverName + ' is trying to tell me about your leave accrual transactions, ' + first_name + '. It\'s Greek to me.',
									        attachments:[
									            {
									                title: 'Anything else I can help you with today, ' + first_name + '?',
									                callback_id: '123',
									                attachment_type: 'default',
									                actions: [
									                    {
									                        "name":"yes",
									                        "text": "Yes",
									                        "value": "yes",
									                        "type": "button",
									                    },
									                    {
									                        "name":"no",
									                        "text": "No",
									                        "value": "no",
									                        "type": "button",
									                    }
									                ]
									            }
									        ]
									    });
					        		}
				        		}
	
					    		logout({}, function(err, result, envelope, soapHeader) {
					    	        console.log('Logged out from OpenAir ok');
					    			//console.log(result);
					    			//console.log(envelope);
					    		});
				    		});
		        		}
		    		});
	    		}
	    	});
	    });
	} else {
		bot.reply(message, 'I\'m just guessing here, but I THINK you have one BILLION hours of vacation time!');
	}
}
