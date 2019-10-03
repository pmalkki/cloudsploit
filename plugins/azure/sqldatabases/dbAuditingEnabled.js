var async = require('async');
var helpers = require('../../../helpers/azure/');

module.exports = {
    title: 'Database Auditing Enabled',
    category: 'SQL Databases',
    description: 'Ensure that SQL Database Auditing is Enabled',
    more_info: 'Enabling SQL Database Auditing ensures that all activities are being logged properly, including malicious activity.',
    recommended_action: '1. Go to SQL databases 2. For each database, Click on Auditing 3. Ensure that Auditing is set to on.',
    link: 'https://docs.microsoft.com/en-us/azure/security-center/security-center-enable-auditing-on-sql-databases',
    apis: ['servers:sql:list', 'databases:listByServer', 'databaseBlobAuditingPolicies:get'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var locations = helpers.locations(settings.govcloud);

        async.each(locations.databases, function(location, rcb){
            var databaseBlobAuditingPolicies = helpers.addSource(cache, source,
                    ['databaseBlobAuditingPolicies', 'get', location]);

            if (!databaseBlobAuditingPolicies) return rcb();

            if (databaseBlobAuditingPolicies.err || !databaseBlobAuditingPolicies.data) {
                helpers.addResult(results, 3,
                    'Unable to query Auditing Policies: ' + helpers.addError(databaseBlobAuditingPolicies), location);
                return rcb();
            };

            if (!databaseBlobAuditingPolicies.data.length) {
                helpers.addResult(results, 0, 'No Database Auditing policies found', location);
                return rcb();
            };

            databaseBlobAuditingPolicies.data.forEach(databaseBlobAuditingPolicy => {
                var databaseIdArr = databaseBlobAuditingPolicy.id.split('/');
                databaseIdArr.length = databaseIdArr.length - 2;
                var databaseId = databaseIdArr.join('/');

                if (databaseBlobAuditingPolicy.state &&
                    databaseBlobAuditingPolicy.state == 'Disabled') {
                    helpers.addResult(results, 2, 'Auditing is not enabled on the SQL Database.', location, databaseId);
                } else {
                    helpers.addResult(results, 0, 'Auditing is enabled on the SQL Database.', location, databaseId);
                };
            });

        rcb();
        }, function() {
            // Global checking goes here
            callback(null, results, source);
        });
    }
};
