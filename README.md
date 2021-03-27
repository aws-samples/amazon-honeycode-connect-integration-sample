## Amazon Honeycode + Connect Sample Integration

This sample implementation shows how to create and approve Amazon Connect 
IVR messages in Amazon Honeycode, and have them pushed live automatically.
Imagine this scenario: an earthquake strikes at midnight, and you'd like your
night suppervizor to turn on the Earthquake emergency message in your IVR. 
But, IT does not allow just anybody to change the contact flow, or there 
is a danger of accidental change if one edits the flow directly, or you 
don't have anybody oncall to edit the flow at midnight. All these and more
are use cases where Honeycode can help you manage your Amazon Connect 
instance, safely, consistently, and quickly.

The code in this sample  works in conjunction with a Honeycode template, 
and optionally with a Amazon Connect instance. Your night shift suppervisor
will be able to enable pre-written and pre-approved emergency messages 
with the touch of a button. Your call center manager will be able to create
or edit messages and your Customer Support Director will be able to approve 
new messages, and view an audit trail.

Of course, this is a sample scenario, but should give you a good idea how 
to integrate the two systems, and how to create safe, reusable, and fast 
tools for your Amazon Contact center administrators. 

In this demonstation lab, we provide all the Lambda code, DynamoDB tables,
Amazon Connect flows you will need. You will also need a Honeycode template
and modify the code slightly to use the newly instantiated template.

For step by step instructions please see the [Docs](docs) directory.

Special credit to Milos Cosic who provided the Amazon Connect to DynamoDB
integration [here](https://aws.amazon.com/blogs/contact-center/build-multilingual-voice-experiences-in-amazon-connect/).

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

