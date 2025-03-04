/**
 * WordPress dependencies
 */
import { useRef, useLayoutEffect, useReducer } from '@wordpress/element';
import { useMergeRefs, useRefEffect } from '@wordpress/compose';
import { useRegistry } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { collapseWhiteSpace, create } from '../create';
import { apply } from '../to-dom';
import { toHTMLString } from '../to-html-string';
import { useDefaultStyle } from './use-default-style';
import { useBoundaryStyle } from './use-boundary-style';
import { useCopyHandler } from './use-copy-handler';
import { useFormatBoundaries } from './use-format-boundaries';
import { useSelectObject } from './use-select-object';
import { useInputAndSelection } from './use-input-and-selection';
import { useSelectionChangeCompat } from './use-selection-change-compat';
import { useDelete } from './use-delete';

export function useRichText( {
	value = '',
	selectionStart,
	selectionEnd,
	placeholder,
	onSelectionChange,
	preserveWhiteSpace,
	onChange,
	__unstableDisableFormats: disableFormats,
	__unstableIsSelected: isSelected,
	__unstableDependencies = [],
	__unstableAfterParse,
	__unstableBeforeSerialize,
	__unstableAddInvisibleFormats,
} ) {
	const registry = useRegistry();
	const [ , forceRender ] = useReducer( () => ( {} ) );
	const ref = useRef();

	function createRecord() {
		const {
			ownerDocument: { defaultView },
		} = ref.current;
		const selection = defaultView.getSelection();
		const range =
			selection.rangeCount > 0 ? selection.getRangeAt( 0 ) : null;

		return create( {
			element: ref.current,
			range,
			__unstableIsEditableTree: true,
		} );
	}

	function applyRecord( newRecord, { domOnly } = {} ) {
		apply( {
			value: newRecord,
			current: ref.current,
			prepareEditableTree: __unstableAddInvisibleFormats,
			__unstableDomOnly: domOnly,
			placeholder,
		} );
	}

	// Internal values are updated synchronously, unlike props and state.
	const _value = useRef( value );
	const record = useRef();

	function setRecordFromProps() {
		_value.current = value;
		record.current = create( {
			html: preserveWhiteSpace
				? value
				: collapseWhiteSpace( typeof value === 'string' ? value : '' ),
		} );
		if ( disableFormats ) {
			record.current.formats = Array( value.length );
			record.current.replacements = Array( value.length );
		}
		if ( __unstableAfterParse ) {
			record.current.formats = __unstableAfterParse( record.current );
		}
		record.current.start = selectionStart;
		record.current.end = selectionEnd;
	}

	const hadSelectionUpdate = useRef( false );

	if ( ! record.current ) {
		hadSelectionUpdate.current = isSelected;
		setRecordFromProps();
	} else if (
		selectionStart !== record.current.start ||
		selectionEnd !== record.current.end
	) {
		hadSelectionUpdate.current = isSelected;
		record.current = {
			...record.current,
			start: selectionStart,
			end: selectionEnd,
			activeFormats: undefined,
		};
	}

	/**
	 * Sync the value to global state. The node tree and selection will also be
	 * updated if differences are found.
	 *
	 * @param {Object} newRecord The record to sync and apply.
	 */
	function handleChange( newRecord ) {
		record.current = newRecord;
		applyRecord( newRecord );

		if ( disableFormats ) {
			_value.current = newRecord.text;
		} else {
			_value.current = toHTMLString( {
				value: __unstableBeforeSerialize
					? {
							...newRecord,
							formats: __unstableBeforeSerialize( newRecord ),
					  }
					: newRecord,
			} );
		}

		const { start, end, formats, text } = newRecord;

		// Selection must be updated first, so it is recorded in history when
		// the content change happens.
		// We batch both calls to only attempt to rerender once.
		registry.batch( () => {
			onSelectionChange( start, end );
			onChange( _value.current, {
				__unstableFormats: formats,
				__unstableText: text,
			} );
		} );
		forceRender();
	}

	function applyFromProps() {
		setRecordFromProps();
		applyRecord( record.current );
	}

	const didMount = useRef( false );

	// Value updates must happen synchonously to avoid overwriting newer values.
	useLayoutEffect( () => {
		if ( didMount.current && value !== _value.current ) {
			applyFromProps();
			forceRender();
		}
	}, [ value ] );

	// Value updates must happen synchonously to avoid overwriting newer values.
	useLayoutEffect( () => {
		if ( ! hadSelectionUpdate.current ) {
			return;
		}

		if ( ref.current.ownerDocument.activeElement !== ref.current ) {
			ref.current.focus();
		}

		applyRecord( record.current );
		hadSelectionUpdate.current = false;
	}, [ hadSelectionUpdate.current ] );

	const mergedRefs = useMergeRefs( [
		ref,
		useDefaultStyle(),
		useBoundaryStyle( { record } ),
		useCopyHandler( { record } ),
		useSelectObject(),
		useFormatBoundaries( { record, applyRecord } ),
		useDelete( {
			createRecord,
			handleChange,
		} ),
		useInputAndSelection( {
			record,
			applyRecord,
			createRecord,
			handleChange,
			isSelected,
			onSelectionChange,
		} ),
		useSelectionChangeCompat(),
		useRefEffect( () => {
			applyFromProps();
			didMount.current = true;
		}, [ placeholder, ...__unstableDependencies ] ),
	] );

	return {
		value: record.current,
		// A function to get the most recent value so event handlers in
		// useRichText implementations have access to it. For example when
		// listening to input events, we internally update the state, but this
		// state is not yet available to the input event handler because React
		// may re-render asynchronously.
		getValue: () => record.current,
		onChange: handleChange,
		ref: mergedRefs,
	};
}

export default function __experimentalRichText() {}
