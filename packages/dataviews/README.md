# DataViews

DataViews is a component that provides an API to render datasets using different types of layouts (table, grid, list, etc.).

## Installation

Install the module

```bash
npm install @wordpress/dataviews --save
```

## Usage

```js
<DataViews
	data={ pages }
	getItemId={ ( item ) => item.id }
	isLoading={ isLoadingPages }
	view={ view }
	onChangeView={ onChangeView }
	fields={ fields }
	actions={ [ trashPostAction ] }
	paginationInfo={ { totalItems, totalPages } }
/>
```

## Data

The dataset to work with, represented as a one-dimensional array.

Example:

```js
[
	{ id: 1, title: "Title", ... },
	{ ... }
]
```

## View

The view object configures how the dataset is visible to the user.

Example:

```js
{
	type: LAYOUT_TABLE,
	perPage: 5,
	page: 1,
	sort: {
		field: 'date',
		direction: 'desc',
	},
	search: '',
	filters: [
		{ field: 'author', operator: OPERATOR_IN, value: 2 },
		{ field: 'status', operator: OPERATOR_IN, value: 'publish,draft' }
	],
	hiddenFields: [ 'date', 'featured-image' ],
	layout: {},
}
```

-   `type`: view type, one of `table`, `grid`, or `side-by-side`.
-   `perPage`: number of records to show per page.
-   `page`: the page that is visible.
-   `sort.field`: field used for sorting the dataset.
-   `sort.direction`: the direction to use for sorting, one of `asc` or `desc`.
-   `search`: the text search applied to the dataset.
-   `filters`: the filters applied to the dataset. Each item describes:
    -   `field`: which field this filter is bound to.
    -   `operator`: which type of filter it is. Only `in` available at the moment.
    -   `value`: the actual value selected by the user.
-   `hiddenFields`: the `id` of the fields that are hidden in the UI.
-   `layout`: config that is specific to a particular layout type.
    -   `mediaField`: used by the `grid` layout. The `id` of the field to be used for rendering each card's media.
    -   `primaryField`: used by the `grid` layout. The `id` of the field to be used for rendering each card's title.

### View <=> data

The view is a representation of the visible state of the dataset. Note, however, that it's the consumer's responsibility to work with the data provider to make sure the user options defined through the view's config (sort, pagination, filters, etc.) are respected.

The following example shows how a view object is used to query the WordPress REST API via the entities abstraction. The same can be done with any other data provider.

```js
function MyCustomPageTable() {
	const [ view, setView ] = useState( {
		type: TABLE_LAYOUT,
		perPage: 5,
		page: 1,
		sort: {
			field: 'date',
			direction: 'desc',
		},
		search: '',
		filters: [
			{ field: 'author', operator: OPERATOR_IN, value: 2 },
			{ field: 'status', operator: OPERATOR_IN, value: 'publish,draft' }
		],
		hiddenFields: [ 'date', 'featured-image' ],
		layout: {},
	} );

	const queryArgs = useMemo( () => {
		const filters = {};
		view.filters.forEach( ( filter ) => {
			if ( filter.field === 'status' && filter.operator === OPERATOR_IN ) {
				filters.status = filter.value;
			}
			if ( filter.field === 'author' && filter.operator === OPERATOR_IN ) {
				filters.author = filter.value;
			}
		} );
		return {
			per_page: view.perPage,
			page: view.page,
			_embed: 'author',
			order: view.sort?.direction,
			orderby: view.sort?.field,
			search: view.search,
			...filters,
		};
	}, [ view ] );

	const {
		records
	} = useEntityRecords( 'postType', 'page', queryArgs );

	return (
		<DataViews
			data={ records }
			view={ view }
			onChangeView={ setView }
			"..."
		/>
	);
}
```

## Fields

The fields describe the visible items for each record in the dataset.

Example:

```js
[
	{
		id: 'date',
		header: __( 'Date' ),
		getValue: ( { item } ) => item.date,
		render: ( { item } ) => {
			return (
				<time>{ getFormattedDate( item.date ) }</time>
			);
		},
		enableHiding: false
	},
	{
		id: 'author',
		header: __( 'Author' ),
		getValue: ( { item } ) => item.author,
		render: ( { item } ) => {
			return (
				<a href="...">{ item.author }</a>
			);
		},
		type: ENUMERATION_TYPE,
		elements: [
			{ value: 1, label: 'Admin' }
			{ value: 2, label: 'User' }
		]
		enableSorting: false
	}
]
```

-   `id`: identifier for the field. Unique.
-   `header`: the field's name to be shown in the UI.
-   `getValue`: function that returns the value of the field.
-   `render`: function that renders the field.
-   `elements`: the set of valid values for the field's value.
-   `type`: the type of the field. Used to generate the proper filters. Only `enumeration` available at the moment.
-   `enableSorting`: whether the data can be sorted by the given field. True by default.
-   `enableHiding`: whether the field can be hidden. True by default.

## Actions

Array of operations that can be performed upon each record. Each action is an object with the following properties:

-   `id`: string, required. Unique identifier of the action. For example, `move-to-trash`.
-   `label`: string, required. User facing description of the action. For example, `Move to Trash`.
-   `isPrimary`: boolean, optional. Whether the action should be listed inline (primary) or in hidden in the more actions menu (secondary).
-   `icon`: icon to show for primary actions. It's required for a primary action, otherwise the action would be considered secondary.
-   `isEligible`: function, optional. Whether the action can be performed for a given record. If not present, the action is considered to be eligible for all items. It takes the given record as input.
-   `isDestructive`: boolean, optional. Whether the action can delete data, in which case the UI would communicate it via red color.
-   `callback`: function, required unless `RenderModal` is provided. Callback function that takes the record as input and performs the required action.
-   `RenderModal`: ReactElement, optional. If an action requires that some UI be rendered in a modal, it can provide a component which takes as props the record as `item` and a `closeModal` function. When this prop is provided, the `callback` property is ignored.
-   `hideModalHeader`: boolean, optional. This property is used in combination with `RenderModal` and controls the visibility of the modal's header. If the action renders a modal and doesn't hide the header, the action's label is going to be used in the modal's header.

## Contributing to this package

This is an individual package that's part of the Gutenberg project. The project is organized as a monorepo. It's made up of multiple self-contained software packages, each with a specific purpose. The packages in this monorepo are published to [npm](https://www.npmjs.com/) and used by [WordPress](https://make.wordpress.org/core/) as well as other software projects.

To find out more about contributing to this package or Gutenberg as a whole, please read the project's main [contributor guide](https://github.com/WordPress/gutenberg/tree/HEAD/CONTRIBUTING.md).

<br /><br /><p align="center"><img src="https://s.w.org/style/images/codeispoetry.png?1" alt="Code is Poetry." /></p>
