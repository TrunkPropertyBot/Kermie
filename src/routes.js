const flowHandler = require('./flowHandler');

module.exports = (app, assistant) => {

  app.post('/api/message', (req, res) => {
    const workspace = process.env.WORKSPACE_ID || '<workspace-id>';
    if (!workspace || workspace === '<workspace-id>') {
      return res.json({
        'output': {
          'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
        }
      });
    }
    const payload = {
      workspace_id: workspace,
      context: req.body.context || {},
      input: req.body.input || {}
    };

    // Send the input to the assistant service
    assistant.message(payload, function(err, data) {
      if (err) {
        return res.status(err.code || 500).json(err);
      }
      return res.json(flowHandler.updateMessage(payload, data));
    });
  });

}