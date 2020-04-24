# Developer Support Ticket Helper

This app lets Z1 agents identify Developer Support tickets.

It is opinionated and only allows one developer platform area to be selected. 

Optionally, additional textual information and effort score can be entered.

Please submit bug reports to gkatechis@zendesk.com

## Setup
1. Import Postman collection **Dev Support Helper App Ticket Fields.postman_collection.json**. Select 'Runner' Postman feature on colleciton. This will create app's needed custom ticket fields.
2. Create ticket form that includes the fields created in step one (i.e. all fields begininning with 'dsapp_')
3. Install app