# add2slack
Front-end web stuff to support add to slack for mirror app

GENERAL
* SOME FLAKINESS ON DEINSTALL/REINSTALL IF DONE IN LESS THAN 5 SECONDS :)
* NO SECURITY ON MONGO AT ALL - BUT ALL CONNECTIONS ARE LOCAL 
* TODO: BASIC RATE LIMITING ON NGINX (ANTI DDOS)

STARTUP/ADMIN
* DONE: CAN SURVIVE SHORT MONGO OUTAGES OK
* DONE PM2 DEFAULT STARTUP DOESN'T WORK - RUN STUFF FROM INSIDE DIRS 
* DONE: MONGO STARTUP NEEDS CONFIG CHANGES ON UBU 18 (fork etc)
* DONE: PM2 STARTUP = pm2 startup -u sean --hp /home/sean (DO pm2 save FIRST)
* DONE: NEED PROCESS TO START ALL OF THIS UP IN THE RIGHT ORDER

ISSUES
* DONE: NICE APP ICON FOR mirror
* DONE: NICE WEBSITE FOR APP AND maclawran.ca
* DONE: ONSCREEN MESSAGE IS WRONG FOR DUP ENTRIES (Success!) - IGNORE & REDIRECT TO SLACK
* DONE: DB ADD SHOULD ADD UNIQUE TEAM IDS ONLY OTHERWISE MESSAGE ALREADY INSTALLED
* DONE: HOW DO WE HANDLE APP REMOVAL - NOTHING... 
* DONE: APP PKG - YOU CHOOSE WHERE TO INSTALL THE APP IN THE TOP-RIGHT HAND DROP DOWN
* DONE: ADD APP DOESN'T SEE DUPS (ALWAYS ADDS)

WEBSITE
* DONE: PRIVACY POLICY (mirror)
* DONE: TERMS OF SERVICE (mirror)

Listens on port 4000 for incoming requests to /auth/redirect and handles them
/auth redirect handled by nginx
/auth/direct is for direct installation (just does a redirect to slack w/params)
/auth/redirect is called once the button is pushed and the app is added to the workspace

The domain, team and token are added to the db and a message is sent via /cmd/add to the bot
so it can add a new client without restarting
