const async = require('async');
const helpers = require('../../../helpers/azure');

module.exports = {
    title: 'LB HTTPS Only',
    category: 'Load Balancer',
    description: 'Ensures LBs are configured to only accept' + 
                 ' connections on HTTPS ports.',
    more_info: 'For maximum security, LBs can be configured to only'+
                ' accept HTTPS connections. Standard HTTP connections '+
                ' will be blocked. This should only be done if the '+
                ' client application is configured to query HTTPS '+
                ' directly and not rely on a redirect from HTTP.',
    link: 'https://docs.microsoft.com/en-us/azure/load-balancer/load-balancer-overview',
    recommended_action: '1. Go to Load Balancers. 2. Select the Load Balancer. 3. Select the Load Balancing Rule blade of Settings. 4. Ensure that only 1 rule is enabled and that the port is 443. 5. Go back and select the Inbound NAT Rules blade under settings. 6. ensure that only one rule is enabled and the port of the rule is 443.',
    apis: ['resourceGroups:list', 'loadBalancers:list'],

    run: function (cache, settings, callback) {
        const results = [];
        const source = {};
        const locations = helpers.locations(settings.govcloud);

        async.each(locations.loadBalancers, function (location, rcb) {

            const loadBalancers = helpers.addSource(cache, source,
                ['loadBalancers', 'list', location]);

            if (!loadBalancers) return rcb();

            if (loadBalancers.err || !loadBalancers.data) {
                helpers.addResult(results, 3,
                    'Unable to query Load Balancers: ' + helpers.addError(loadBalancers), location);
                return rcb();
            };

            if (!loadBalancers.data.length) {
                helpers.addResult(results, 0, 'No existing Load Balancers', location);
                return rcb();
            };

            loadBalancers.data.forEach(loadBalancer => {
                var notHTTPSRules = 0;
                var isHTTPS = false;

                if (loadBalancer.inboundNatRules.length > 0) {
                    loadBalancer.inboundNatRules.forEach(inboundRule => {
                        if (inboundRule.frontendPort == 443) {
                            isHTTPS = true;
                        } else {
                            notHTTPSRules++;
                        }
                    });
                };

                if (loadBalancer.loadBalancingRules.length > 0) {
                    loadBalancer.loadBalancingRules.forEach(loadBalancingRule => {
                        if (loadBalancingRule.frontendPort == 443) {
                            isHTTPS = true;
                        } else {
                            notHTTPSRules++;
                        };
                    });
                };

                if (notHTTPSRules && isHTTPS) {
                    helpers.addResult(results, 1,
                        'HTTPS is configured but other ports are open.', location, loadBalancer.id);
                } else if (notHTTPSRules && !isHTTPS) {
                    helpers.addResult(results, 2,
                        'HTTPS is not configured and other ports are open.', location, loadBalancer.id);
                } else if (isHTTPS) {
                    helpers.addResult(results, 0,
                        'Only HTTPS is configured.', location, loadBalancer.id);
                } else {
                    helpers.addResult(results, 0,
                        'No inbound rules.', location, loadBalancer.id);
                };
            });
            rcb();
        }, function () {
            // Global checking goes here
            callback(null, results, source);
        });
    }
};
