import { iff, printBlock, qref, raw } from 'graphql-mapping-template'
import { ResolverResourceIDs } from 'graphql-transformer-common'
import { gql, Transformer } from 'graphql-transformer-core'

const protectedDirective = gql` directive @protected on FIELD_DEFINITION `

export default class ProtectedTransformer extends Transformer {
	constructor() {
		super('ProtectedTransformer', protectedDirective)
	}

	field(parent, definition, directive, ctx) {

		let fieldName = definition.name.value
		let typeName = parent.name.value
		let [ argument ] = directive.arguments
		let value = JSON.stringify(argument ? argument.value.value : null)

		let getID = ResolverResourceIDs.DynamoDBGetResolverResourceID(typeName)
		let getStep = printBlock(`[graphql-protected-transformer] Protecting "${fieldName}"`)(
			iff(raw(`!$util.isNull($ctx.result.${fieldName})`), qref(`$ctx.result.put("${fieldName}", ${value})`), true)
		)
		let getResolver = ctx.getResource(getID)
		if (getResolver) getResolver.Properties.ResponseMappingTemplate = getStep + '\n\n' + getResolver.Properties.ResponseMappingTemplate
		ctx.setResource(getID, getResolver)
		
		let listID = ResolverResourceIDs.DynamoDBListResolverResourceID(typeName)
		let listStep = printBlock(`[graphql-protected-transformer] Protecting "${fieldName}"`)(
			raw(`
#foreach ($item in $ctx.result.items)
	#if (!$util.isNull($item.${fieldName}))
		$util.qr($item.put("${fieldName}", ${value}))
	#end
#end
`))
		let listResolver = ctx.getResource(listID)
		if (listResolver) listResolver.Properties.ResponseMappingTemplate = listStep + '\n\n' + listResolver.Properties.ResponseMappingTemplate
		ctx.setResource(listID, listResolver)
	}
}
