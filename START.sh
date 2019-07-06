#/bin/bash
#
# ASSUMES PM2 IS INSTALLED... THIS JUST GETS IT STARTED
#
cd slack-oauth
pm2 start slack-oauth.js
cd ../mqtt-slack
pm2 start mqtt-slack.js
cd ../mirror-bot
pm2 start mirror-bot.js
