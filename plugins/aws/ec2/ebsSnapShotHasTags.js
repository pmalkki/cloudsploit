var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'EBS Snapshot Has Tags',
    category: 'EC2',
    domain: 'Compute',
    description: 'Ensure that EBS snapshots have tags',
    more_info: 'Tags help you to group resources together that are related to or associated with each other. It is a best practice to tag cloud resources to better organize and gain visibility into their usage.',
    link: 'https://aws.amazon.com/blogs/compute/tag-amazon-ebs-snapshots-on-creation-and-implement-stronger-security-policies/',
    recommended_action: 'Modify EBS snapshots and add tags.',
    apis: ['EC2:describeSnapshots'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings);
        var awsOrGov = helpers.defaultPartition(settings);

        async.each(regions.ec2, function(region, rcb){
            var describeSnapshots = helpers.addSource(cache, source,
                ['ec2', 'describeSnapshots', region]);

            if (!describeSnapshots) return rcb();

            if (describeSnapshots.err || !describeSnapshots.data) {
                helpers.addResult(results, 3,
                    `Unable to query for EBS Snapshots: ${helpers.addError(describeSnapshots)}`, region);
                return rcb();
            }

            if (!describeSnapshots.data.length) {
                helpers.addResult(results, 0, 'No EBS snapshots present', region);
                return rcb();
            }
            for (let snapshot of describeSnapshots.data){
                var resourceARN = `arn:${awsOrGov}:${region}:${snapshot.OwnerId}:snapshot/${snapshot.SnapshotId}`;

                if (!snapshot.Tags || !snapshot.Tags.length) {
                    helpers.addResult(results, 2, 'EBS Snapshot has no Tags associated.', region, resourceARN);
                } else {
                    helpers.addResult(results, 0, 'EBS Snapshot have tags.', region, resourceARN);
                }
            }
            rcb();
        }, function(){
            callback(null, results, source);
        });
    }
};
