/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var watson = require('watson-developer-cloud'); // watson sdk
var request = require('superagent-bluebird-promise');
var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper

var assistant = new watson.AssistantV1({
  // If unspecified here, the ASSISTANT_USERNAME and ASSISTANT_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  username: process.env.ASSISTANT_USERNAME || '<username>',
  password: process.env.ASSISTANT_PASSWORD || '<password>',
  version: '2018-02-16'
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  // Send the input to the assistant service
  assistant.message(payload, function(err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    updateMessage(payload,data)
    .then( (response) => {
      return res.json(response);
    });
  });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Assistant service
 * @param  {Object} response The response from the Assistant service
 * @return {Object}          The response with the updated message
 */
 async function updateMessage(input, response) {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } 
  else {
    var url = null;
    
    // call external API with parameters
    if(response.intents.length > 0){
      console.log(response.context.currentContext);
      if(response.intents[0].intent === 'averageRent'){
        url = 'https://7jk4gr3buj.execute-api.us-east-1.amazonaws.com/trunkfinal/averagerent?suburb='+response.entities[0].value;
      }else if(response.context.currentContext === 'property' || response.context.currentContext ==='bedrooms'
     || response.context.currentContext === 'bathrooms' || response.context.currentContext === 'carparking' && response.context.address){
       console.log('why' + response.context.address);
        url = 'https://7jk4gr3buj.execute-api.us-east-1.amazonaws.com/trunkfinal/properties?address='+response.context.address;
      }else if(response.intents[0].intent === 'inspections'){
        url = 'https://7jk4gr3buj.execute-api.us-east-1.amazonaws.com/trunkfinal/inspections';
      }else if(response.intents[0].intent === 'Repairs'){
        url = 'https://7jk4gr3buj.execute-api.us-east-1.amazonaws.com/trunkfinal/getrepair';
      }else if(response.context.currentContext === 'publictransport' && response.context.address){
        url = 'https://7jk4gr3buj.execute-api.us-east-1.amazonaws.com/trunkfinal/gettransport?address='+response.context.address;
      }else if(response.context.currentContext === 'tenant' && response.context.address){
        url = 'https://7jk4gr3buj.execute-api.us-east-1.amazonaws.com/trunkfinal/gettenants?address='+response.context.address;
      }else if(response.context.currentContext === 'landlord' && response.context.address){
        url = 'https://7jk4gr3buj.execute-api.us-east-1.amazonaws.com/trunkfinal/getlandlord?address='+response.context.address;
      }
      // Average rent API
      console.log(url);

      if(url != null){
      try {
        const apiCall = await request.get(url);
        // Average rent response
      if(response.intents[0].intent === 'averageRent'){
        response.output.text = 'The average rent for '+response.entities[0].value+' is $'+apiCall.body[0].average_rent+ ' per week';
        }else if(response.context.currentContext === 'property'){
        var property = apiCall.body[0];
        response.output.text = 'Address: '+property.address + ' Bedrooms: '+property.bedrooms +' Bathrooms: '+property.bathrooms +' Carspaces: '
        +property.carspaces + ' Description: '+property.description;
        }else if(response.context.currentContext === 'bedrooms'){
          response.output.text = 'The property has '+ apiCall.body[0].bedrooms +' bedrooms.';
        }else if(response.context.currentContext  === 'bathrooms'){
          response.output.text = 'The property has '+apiCall.body[0].bathrooms+' bathrooms, one of them is an en-suite to the master bedroom.';
        }else if(response.context.currentContext === 'carparking'){
          response.output.text = 'The property at '+apiCall.body[0].address+' has '+apiCall.body[0].carspaces+' private car parking space, it also has some available street parking.';
        }else  if(response.intents[0].intent === 'inspections'){
          response.output.text = 'You have '+apiCall.body.length+ ' inspections: ';
          apiCall.body.forEach(element => {
            response.output.text += element.id +'. '+'Date: '+element.date.substring(0,10) +' Time: '+
            element.time.substring(0,5)+' Address: '+element.address+ ' ';
          });
          }else if(response.intents[0].intent === 'Repairs'){
            response.output.text = 'You need to chase up ';
            apiCall.body.forEach(element => {
              response.output.text += 'Address: '+element.address + ' Issue: '+element.repairs+' ';
            });
          }else if(response.context.currentContext === 'publictransport'){
            response.output.text = apiCall.body[0].transport;
          }else if(response.context.currentContext === 'tenant'){
            if(apiCall.body[0].tenants != null){
              response.output.text ='The property is leased by '+apiCall.body[0].tenants;
            }else{
              response.output.text = 'Currently there is no tenants at '+response.context.address;
            }
          }else if(response.context.currentContext === 'landlord'){
            response.output.text  = 'The landlord for '+response.context.address+' is '+apiCall.body[0].landlord;
          }
      
      } catch(e) {
        console.log(e);
      }
    }
  }

    console.log("current response: "+response.output.text);
    return response;
  }
  if (response.intents && response.intents[0]) {
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  return response;
}
module.exports = app;
