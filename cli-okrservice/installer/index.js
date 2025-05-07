
var amqplib = require('amqplib');

var open = amqplib.connect(process.env.RABBITMQ_HOST);
var queueName = 'managePluginInstall';
const { execSync } = require('child_process');

var sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
};

// Consumer
open
  .then(function(conn) {
    return conn.createChannel();
  })
  .then(function(ch) {
    return ch.assertQueue(queueName).then(function(ok) {
      console.log('Waiting for installer message .....');

      ch.consume(
        queueName,
        async msg => {
          if (msg !== null) {
            var content = msg.content.toString();

            console.log(`Received rpc queue message ${content}`);

            var { data } = JSON.parse(content);

            var sendMessage = (ch, message) => {
              console.log(message);

              ch.sendToQueue(
                'core:manage-installation-notification',
                Buffer.from(JSON.stringify({ ...data, message } )),
              );
            }

            sendMessage(ch, 'started');

            execSync('cd ..');

            // Update configs.json
            execSync(`npm run okrservice installer-update-configs ${data.type} ${data.name}`);

            if (data.type === 'install') {
              sendMessage(ch, 'Running up ....');
              execSync(`npm run okrservice up -- --fromInstaller`);

              sendMessage(ch, 'Syncing ui ....');
              execSync(`npm run okrservice syncui ${data.name}`);

              sendMessage(ch, 'Restarting coreui ....');
              execSync(`npm run okrservice restart coreui`);

              sendMessage(ch, 'Waiting for 10 seconds for plugin api....');
              await sleep(10000);

              sendMessage(ch, 'Restarting gateway ...');
              execSync(`npm run okrservice restart gateway`);
            }

            if (data.type === 'uninstall') {
              sendMessage(ch, 'Running up');
              execSync(`npm run okrservice up -- --fromInstaller`);

              sendMessage(ch, `Removing ${data.name} service ....`);
              execSync(`npm run okrservice remove-service erxes_plugin-${data.name}-api`);

              sendMessage(ch, `Restarting coreui ....`);
              execSync(`npm run okrservice restart coreui`);

              sendMessage(ch, `Restarting gateway ....`);
              execSync(`npm run okrservice restart gateway`);
            }

            execSync('cd installer');

            sendMessage(ch, `done`);

            ch.ack(msg);

            console.log(`Done ${content}`);
          }
        },
        { noAck: false }
      );
    });
  })
  .catch(console.warn);