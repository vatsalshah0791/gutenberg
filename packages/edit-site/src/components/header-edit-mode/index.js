/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useViewportMatch, useReducedMotion } from '@wordpress/compose';
import { store as coreStore } from '@wordpress/core-data';
import {
	__experimentalPreviewOptions as PreviewOptions,
	privateApis as blockEditorPrivateApis,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { PinnedItems } from '@wordpress/interface';
import { __ } from '@wordpress/i18n';
import { external, next, previous } from '@wordpress/icons';
import {
	Button,
	__unstableMotion as motion,
	MenuGroup,
	MenuItem,
	Popover,
	VisuallyHidden,
} from '@wordpress/components';
import { store as preferencesStore } from '@wordpress/preferences';

/**
 * Internal dependencies
 */
import MoreMenu from './more-menu';
import SaveButton from '../save-button';
import DocumentActions from './document-actions';
import DocumentTools from './document-tools';
import { store as editSiteStore } from '../../store';
import {
	getEditorCanvasContainerTitle,
	useHasEditorCanvasContainer,
} from '../editor-canvas-container';
import { unlock } from '../../lock-unlock';
import { FOCUSABLE_ENTITIES } from '../../utils/constants';

const { BlockContextualToolbar } = unlock( blockEditorPrivateApis );

export default function HeaderEditMode( { setListViewToggleElement } ) {
	const {
		deviceType,
		templateType,
		isDistractionFree,
		blockEditorMode,
		blockSelectionStart,
		homeUrl,
		showIconLabels,
		editorCanvasView,
		hasFixedToolbar,
		isZoomOutMode,
	} = useSelect( ( select ) => {
		const { __experimentalGetPreviewDeviceType, getEditedPostType } =
			select( editSiteStore );
		const { getBlockSelectionStart, __unstableGetEditorMode } =
			select( blockEditorStore );

		const postType = getEditedPostType();

		const {
			getUnstableBase, // Site index.
		} = select( coreStore );

		const { get: getPreference } = select( preferencesStore );

		return {
			deviceType: __experimentalGetPreviewDeviceType(),
			templateType: postType,
			blockEditorMode: __unstableGetEditorMode(),
			blockSelectionStart: getBlockSelectionStart(),
			homeUrl: getUnstableBase()?.home,
			showIconLabels: getPreference(
				editSiteStore.name,
				'showIconLabels'
			),
			editorCanvasView: unlock(
				select( editSiteStore )
			).getEditorCanvasContainerView(),
			hasFixedToolbar: getPreference(
				editSiteStore.name,
				'fixedToolbar'
			),
			isDistractionFree: getPreference(
				editSiteStore.name,
				'distractionFree'
			),
			isZoomOutMode: __unstableGetEditorMode() === 'zoom-out',
		};
	}, [] );

	const isLargeViewport = useViewportMatch( 'medium' );
	const isTopToolbar = ! isZoomOutMode && hasFixedToolbar && isLargeViewport;
	const blockToolbarRef = useRef();

	const { __experimentalSetPreviewDeviceType: setPreviewDeviceType } =
		useDispatch( editSiteStore );
	const disableMotion = useReducedMotion();

	const hasDefaultEditorCanvasView = ! useHasEditorCanvasContainer();

	const isFocusMode = FOCUSABLE_ENTITIES.includes( templateType );

	const isZoomedOutView = blockEditorMode === 'zoom-out';

	const [ isBlockToolsCollapsed, setIsBlockToolsCollapsed ] =
		useState( true );

	const hasBlockSelected = !! blockSelectionStart;

	useEffect( () => {
		// If we have a new block selection, show the block tools
		if ( blockSelectionStart ) {
			setIsBlockToolsCollapsed( false );
		}
	}, [ blockSelectionStart ] );

	const toolbarVariants = {
		isDistractionFree: { y: '-50px' },
		isDistractionFreeHovering: { y: 0 },
		view: { y: 0 },
		edit: { y: 0 },
	};

	const toolbarTransition = {
		type: 'tween',
		duration: disableMotion ? 0 : 0.2,
		ease: 'easeOut',
	};

	return (
		<div
			className={ classnames( 'edit-site-header-edit-mode', {
				'show-icon-labels': showIconLabels,
			} ) }
		>
			{ hasDefaultEditorCanvasView && (
				<motion.div
					className="edit-site-header-edit-mode__start"
					variants={ toolbarVariants }
					transition={ toolbarTransition }
				>
					<DocumentTools
						blockEditorMode={ blockEditorMode }
						isDistractionFree={ isDistractionFree }
						showIconLabels={ showIconLabels }
						setListViewToggleElement={ setListViewToggleElement }
					/>
					{ isTopToolbar && (
						<>
							<div
								className={ classnames(
									'selected-block-tools-wrapper',
									{
										'is-collapsed': isBlockToolsCollapsed,
									}
								) }
							>
								<BlockContextualToolbar isFixed />
							</div>
							<Popover.Slot
								ref={ blockToolbarRef }
								name="block-toolbar"
							/>
							{ hasBlockSelected && (
								<Button
									className="edit-site-header-edit-mode__block-tools-toggle"
									icon={
										isBlockToolsCollapsed ? next : previous
									}
									onClick={ () => {
										setIsBlockToolsCollapsed(
											( collapsed ) => ! collapsed
										);
									} }
									label={
										isBlockToolsCollapsed
											? __( 'Show block tools' )
											: __( 'Hide block tools' )
									}
								/>
							) }
						</>
					) }
				</motion.div>
			) }

			{ ! isDistractionFree && (
				<div
					className={ classnames(
						'edit-site-header-edit-mode__center',
						{
							'is-collapsed':
								! isBlockToolsCollapsed && isLargeViewport,
						}
					) }
				>
					{ ! hasDefaultEditorCanvasView ? (
						getEditorCanvasContainerTitle( editorCanvasView )
					) : (
						<DocumentActions />
					) }
				</div>
			) }

			<div className="edit-site-header-edit-mode__end">
				<motion.div
					className="edit-site-header-edit-mode__actions"
					variants={ toolbarVariants }
					transition={ toolbarTransition }
				>
					<div
						className={ classnames(
							'edit-site-header-edit-mode__preview-options',
							{ 'is-zoomed-out': isZoomedOutView }
						) }
					>
						<PreviewOptions
							deviceType={ deviceType }
							setDeviceType={ setPreviewDeviceType }
							label={ __( 'View' ) }
							isEnabled={
								! isFocusMode && hasDefaultEditorCanvasView
							}
							showIconLabels={ showIconLabels }
						>
							{ ( { onClose } ) => (
								<MenuGroup>
									<MenuItem
										href={ homeUrl }
										target="_blank"
										icon={ external }
										onClick={ onClose }
									>
										{ __( 'View site' ) }
										<VisuallyHidden as="span">
											{
												/* translators: accessibility text */
												__( '(opens in a new tab)' )
											}
										</VisuallyHidden>
									</MenuItem>
								</MenuGroup>
							) }
						</PreviewOptions>
					</div>
					<SaveButton />
					{ ! isDistractionFree && (
						<PinnedItems.Slot scope="core/edit-site" />
					) }
					<MoreMenu showIconLabels={ showIconLabels } />
				</motion.div>
			</div>
		</div>
	);
}
