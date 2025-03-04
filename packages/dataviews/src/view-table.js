/**
 * External dependencies
 */
import {
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	useReactTable,
	flexRender,
} from '@tanstack/react-table';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useAsyncList } from '@wordpress/compose';
import {
	chevronDown,
	chevronUp,
	unseen,
	check,
	arrowUp,
	arrowDown,
	chevronRightSmall,
	funnel,
} from '@wordpress/icons';
import {
	Button,
	Icon,
	privateApis as componentsPrivateApis,
} from '@wordpress/components';
import { useMemo, Children, Fragment } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { unlock } from './lock-unlock';
import ItemActions from './item-actions';
import { ENUMERATION_TYPE, OPERATOR_IN } from './constants';

const {
	DropdownMenuV2: DropdownMenu,
	DropdownMenuGroupV2: DropdownMenuGroup,
	DropdownMenuItemV2: DropdownMenuItem,
	DropdownMenuSeparatorV2: DropdownMenuSeparator,
	DropdownSubMenuV2: DropdownSubMenu,
	DropdownSubMenuTriggerV2: DropdownSubMenuTrigger,
} = unlock( componentsPrivateApis );

const EMPTY_OBJECT = {};
const sortingItemsInfo = {
	asc: { icon: arrowUp, label: __( 'Sort ascending' ) },
	desc: { icon: arrowDown, label: __( 'Sort descending' ) },
};
const sortIcons = { asc: chevronUp, desc: chevronDown };

function HeaderMenu( { dataView, header } ) {
	if ( header.isPlaceholder ) {
		return null;
	}
	const text = flexRender(
		header.column.columnDef.header,
		header.getContext()
	);
	const isSortable = !! header.column.getCanSort();
	const isHidable = !! header.column.getCanHide();
	if ( ! isSortable && ! isHidable ) {
		return text;
	}
	const sortedDirection = header.column.getIsSorted();

	let filter;
	if ( header.column.columnDef.type === ENUMERATION_TYPE ) {
		filter = {
			field: header.column.columnDef.id,
			elements: header.column.columnDef.elements || [],
		};
	}
	const isFilterable = !! filter;

	return (
		<DropdownMenu
			align="start"
			trigger={
				<Button
					icon={ sortIcons[ header.column.getIsSorted() ] }
					iconPosition="right"
					text={ text }
					style={ { padding: 0 } }
				/>
			}
		>
			<WithSeparators>
				{ isSortable && (
					<DropdownMenuGroup>
						{ Object.entries( sortingItemsInfo ).map(
							( [ direction, info ] ) => (
								<DropdownMenuItem
									key={ direction }
									role="menuitemradio"
									aria-checked={
										sortedDirection === direction
									}
									prefix={ <Icon icon={ info.icon } /> }
									suffix={
										sortedDirection === direction && (
											<Icon icon={ check } />
										)
									}
									onSelect={ ( event ) => {
										event.preventDefault();
										if ( sortedDirection === direction ) {
											dataView.resetSorting();
										} else {
											dataView.setSorting( [
												{
													id: header.column.id,
													desc: direction === 'desc',
												},
											] );
										}
									} }
								>
									{ info.label }
								</DropdownMenuItem>
							)
						) }
					</DropdownMenuGroup>
				) }
				{ isHidable && (
					<DropdownMenuItem
						role="menuitemradio"
						aria-checked={ ! header.column.getIsVisible() }
						prefix={ <Icon icon={ unseen } /> }
						onSelect={ ( event ) => {
							event.preventDefault();
							header.column.getToggleVisibilityHandler()( event );
						} }
					>
						{ __( 'Hide' ) }
					</DropdownMenuItem>
				) }
				{ isFilterable && (
					<DropdownMenuGroup>
						<DropdownSubMenu
							key={ filter.field }
							trigger={
								<DropdownSubMenuTrigger
									prefix={ <Icon icon={ funnel } /> }
									suffix={
										<Icon icon={ chevronRightSmall } />
									}
								>
									{ __( 'Filter by' ) }
								</DropdownSubMenuTrigger>
							}
						>
							{ filter.elements.map( ( element ) => {
								let isActive = false;
								const columnFilters =
									dataView.getState().columnFilters;
								const columnFilter = columnFilters.find(
									( f ) =>
										Object.keys( f )[ 0 ].split(
											':'
										)[ 0 ] === filter.field
								);

								if ( columnFilter ) {
									const value =
										Object.values( columnFilter )[ 0 ];
									// Intentionally use loose comparison, so it does type conversion.
									// This covers the case where a top-level filter for the same field converts a number into a string.
									isActive = element.value == value; // eslint-disable-line eqeqeq
								}

								return (
									<DropdownMenuItem
										key={ element.value }
										role="menuitemradio"
										aria-checked={ isActive }
										suffix={
											isActive && <Icon icon={ check } />
										}
										onSelect={ () => {
											const otherFilters =
												columnFilters?.filter(
													( f ) => {
														const [
															field,
															operator,
														] =
															Object.keys(
																f
															)[ 0 ].split( ':' );
														return (
															field !==
																filter.field ||
															operator !==
																OPERATOR_IN
														);
													}
												);

											dataView.setColumnFilters( [
												...otherFilters,
												{
													[ filter.field + ':in' ]:
														isActive
															? undefined
															: element.value,
												},
											] );
										} }
									>
										{ element.label }
									</DropdownMenuItem>
								);
							} ) }
						</DropdownSubMenu>
					</DropdownMenuGroup>
				) }
			</WithSeparators>
		</DropdownMenu>
	);
}

function WithSeparators( { children } ) {
	return Children.toArray( children )
		.filter( Boolean )
		.map( ( child, i ) => (
			<Fragment key={ i }>
				{ i > 0 && <DropdownMenuSeparator /> }
				{ child }
			</Fragment>
		) );
}

function ViewTable( {
	view,
	onChangeView,
	fields,
	actions,
	data,
	getItemId,
	isLoading = false,
	paginationInfo,
} ) {
	const columns = useMemo( () => {
		const _columns = fields.map( ( field ) => {
			const { render, getValue, ...column } = field;
			column.cell = ( props ) =>
				render( { item: props.row.original, view } );
			if ( getValue ) {
				column.accessorFn = ( item ) => getValue( { item } );
			}
			return column;
		} );
		if ( actions?.length ) {
			_columns.push( {
				header: __( 'Actions' ),
				id: 'actions',
				cell: ( props ) => {
					return (
						<ItemActions
							item={ props.row.original }
							actions={ actions }
						/>
					);
				},
				enableHiding: false,
			} );
		}

		return _columns;
	}, [ fields, actions, view ] );

	const columnVisibility = useMemo( () => {
		if ( ! view.hiddenFields?.length ) {
			return;
		}
		return view.hiddenFields.reduce(
			( accumulator, fieldId ) => ( {
				...accumulator,
				[ fieldId ]: false,
			} ),
			{}
		);
	}, [ view.hiddenFields ] );

	/**
	 * Transform the filters from the view format into the tanstack columns filter format.
	 *
	 * Input:
	 *
	 * view.filters = [
	 *   { field: 'date', operator: 'before', value: '2020-01-01' },
	 *   { field: 'date', operator: 'after', value: '2020-01-01' },
	 * ]
	 *
	 * Output:
	 *
	 * columnFilters = [
	 *   { "date:before": '2020-01-01' },
	 *   { "date:after": '2020-01-01' }
	 * ]
	 *
	 * @param {Array} filters The view filters to transform.
	 * @return {Array} The transformed TanStack column filters.
	 */
	const toTanStackColumnFilters = ( filters ) =>
		filters?.map( ( filter ) => ( {
			[ filter.field + ':' + filter.operator ]: filter.value,
		} ) );

	/**
	 * Transform the filters from the view format into the tanstack columns filter format.
	 *
	 * Input:
	 *
	 * columnFilters = [
	 *   { "date:before": '2020-01-01'},
	 *   { "date:after": '2020-01-01' }
	 * ]
	 *
	 * Output:
	 *
	 * view.filters = [
	 *   { field: 'date', operator: 'before', value: '2020-01-01' },
	 *   { field: 'date', operator: 'after', value: '2020-01-01' },
	 * ]
	 *
	 * @param {Array} filters The TanStack column filters to transform.
	 * @return {Array} The transformed view filters.
	 */
	const fromTanStackColumnFilters = ( filters ) =>
		filters.map( ( filter ) => {
			const [ key, value ] = Object.entries( filter )[ 0 ];
			const [ field, operator ] = key.split( ':' );
			return { field, operator, value };
		} );

	const shownData = useAsyncList( data );
	const dataView = useReactTable( {
		data: shownData,
		columns,
		manualSorting: true,
		manualFiltering: true,
		manualPagination: true,
		enableRowSelection: true,
		state: {
			sorting: view.sort
				? [
						{
							id: view.sort.field,
							desc: view.sort.direction === 'desc',
						},
				  ]
				: [],
			globalFilter: view.search,
			columnFilters: toTanStackColumnFilters( view.filters ),
			pagination: {
				pageIndex: view.page,
				pageSize: view.perPage,
			},
			columnVisibility: columnVisibility ?? EMPTY_OBJECT,
		},
		getRowId: getItemId,
		onSortingChange: ( sortingUpdater ) => {
			onChangeView( ( currentView ) => {
				const sort =
					typeof sortingUpdater === 'function'
						? sortingUpdater(
								currentView.sort
									? [
											{
												id: currentView.sort.field,
												desc:
													currentView.sort
														.direction === 'desc',
											},
									  ]
									: []
						  )
						: sortingUpdater;
				if ( ! sort.length ) {
					return {
						...currentView,
						sort: {},
					};
				}
				const [ { id, desc } ] = sort;
				return {
					...currentView,
					sort: { field: id, direction: desc ? 'desc' : 'asc' },
				};
			} );
		},
		onColumnVisibilityChange: ( columnVisibilityUpdater ) => {
			onChangeView( ( currentView ) => {
				const hiddenFields = Object.entries(
					columnVisibilityUpdater()
				).reduce(
					( accumulator, [ fieldId, value ] ) => {
						if ( value ) {
							return accumulator.filter(
								( id ) => id !== fieldId
							);
						}
						return [ ...accumulator, fieldId ];
					},
					[ ...( currentView.hiddenFields || [] ) ]
				);
				return {
					...currentView,
					hiddenFields,
				};
			} );
		},
		onGlobalFilterChange: ( value ) => {
			onChangeView( { ...view, search: value, page: 1 } );
		},
		onColumnFiltersChange: ( columnFiltersUpdater ) => {
			onChangeView( {
				...view,
				filters: fromTanStackColumnFilters( columnFiltersUpdater() ),
				page: 1,
			} );
		},
		onPaginationChange: ( paginationUpdater ) => {
			onChangeView( ( currentView ) => {
				const { pageIndex, pageSize } = paginationUpdater( {
					pageIndex: currentView.page,
					pageSize: currentView.perPage,
				} );
				return { ...view, page: pageIndex, perPage: pageSize };
			} );
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		pageCount: paginationInfo.totalPages,
	} );

	const { rows } = dataView.getRowModel();
	const hasRows = !! rows?.length;
	if ( isLoading ) {
		// TODO:Add spinner or progress bar..
		return <h3>{ __( 'Loading' ) }</h3>;
	}
	return (
		<div className="dataviews-table-view-wrapper">
			{ hasRows && (
				<table className="dataviews-table-view">
					<thead>
						{ dataView.getHeaderGroups().map( ( headerGroup ) => (
							<tr key={ headerGroup.id }>
								{ headerGroup.headers.map( ( header ) => (
									<th
										key={ header.id }
										colSpan={ header.colSpan }
										style={ {
											width:
												header.column.columnDef.width ||
												undefined,
											minWidth:
												header.column.columnDef
													.minWidth || undefined,
											maxWidth:
												header.column.columnDef
													.maxWidth || undefined,
										} }
										data-field-id={ header.id }
									>
										<HeaderMenu
											dataView={ dataView }
											header={ header }
										/>
									</th>
								) ) }
							</tr>
						) ) }
					</thead>
					<tbody>
						{ rows.map( ( row ) => (
							<tr key={ row.id }>
								{ row.getVisibleCells().map( ( cell ) => (
									<td
										key={ cell.column.id }
										style={ {
											width:
												cell.column.columnDef.width ||
												undefined,
											minWidth:
												cell.column.columnDef
													.minWidth || undefined,
											maxWidth:
												cell.column.columnDef
													.maxWidth || undefined,
										} }
									>
										{ flexRender(
											cell.column.columnDef.cell,
											cell.getContext()
										) }
									</td>
								) ) }
							</tr>
						) ) }
					</tbody>
				</table>
			) }
			{ ! hasRows && <p>{ __( 'no results' ) }</p> }
		</div>
	);
}

export default ViewTable;
