/**
 * dsh-annotate — browser half.
 *
 * Replaces the plain "quote text" selection action with a compact annotation
 * composer: pick text in a settled reply, type one optional comment, confirm.
 * The result travels through the existing composer quote channel as
 *
 *   > picked text
 *   > ↳ 批注：your comment
 *
 * so the composer shows one atomic quote chip, the model reads ordinary
 * Markdown, and neither the draft schema nor the editor needs a new node type.
 */
window.__ModuleLoader__.load({
	id: 'dsh-annotate',
	factory: (require) => {
		var module = { exports: {} }
		var exports = module.exports
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

		let react = require('react')
		let primitives = require('@deepseek-ai/dsh-client-ui-primitives')

		//#region styles
		const css = `
.dsh-annotate-pop{display:flex;flex-direction:column;gap:8px;width:min(340px,calc(100vw - 32px));box-sizing:border-box;padding:10px;corner-shape:round;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.1));border-radius:14px;background:var(--dsw-alias-button-floating-fill,#fff);box-shadow:var(--dsw-elevation-panel,0 6px 24px rgba(0,0,0,.14));color:var(--dsw-alias-label-primary,#111);font:var(--dsw-font-xs-13,13px/1.5 system-ui,sans-serif)}
.dsh-annotate-excerpt{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;padding-left:8px;border-left:2px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));color:var(--dsw-alias-label-secondary,#5f6368);font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;user-select:text}
.dsh-annotate-row{display:flex;align-items:center;gap:8px}
.dsh-annotate-input{flex:1;min-width:0;height:32px;padding:0 12px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:999px;background:transparent;color:inherit;font:inherit;font-size:13px;outline:none}
.dsh-annotate-input::placeholder{color:var(--dsw-alias-label-tertiary,#9aa0a6)}
.dsh-annotate-input:focus{border-color:var(--dsw-alias-state-business-primary,#2f6bff)}
.dsh-annotate-ok{flex:none;display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:999px;background:var(--dsw-alias-label-primary,#111);color:var(--dsw-alias-button-floating-fill,#fff);cursor:pointer}
.dsh-annotate-ok:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#2f6bff);outline-offset:2px}
.dsh-annotate-hint{font-size:11px;line-height:1.4;color:var(--dsw-alias-label-tertiary,#9aa0a6)}
.dsh-annotate-warn{color:var(--dsw-alias-state-warning-primary,#b26a00)}

/* 输入框上方的批注汇总：面板 + 胶囊。
   引用块仍然作为 quote 节点留在草稿里（核心没有第二条把引用带给发送流程的路），
   但输入框里那一块用 display:none 收起来，视觉上就是 ChatGPT 那种「只在胶囊里」。 */
.dsh-annotate-dock{display:flex;flex-direction:column;align-items:flex-start;gap:8px;width:100%}
.dsh-annotate-panel{width:100%;box-sizing:border-box;overflow:hidden;corner-shape:round;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.1));border-radius:14px;background:var(--dsw-alias-button-floating-fill,#fff);box-shadow:var(--dsw-elevation-panel,0 6px 24px rgba(0,0,0,.12));color:var(--dsw-alias-label-primary,#111)}
.dsh-annotate-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;padding:12px 14px;border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06))}
.dsh-annotate-item:first-child{border-top:0}
.dsh-annotate-itemHead{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-annotate-itemTitle{font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-secondary,#5f6368)}
.dsh-annotate-itemTools{display:flex;align-items:center;gap:2px;flex:none}
.dsh-annotate-tool{display:flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary,#9aa0a6);cursor:pointer}
.dsh-annotate-tool:hover{background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#111)}
.dsh-annotate-quoteText{grid-column:1/-1;font-size:14px;line-height:1.65;color:var(--dsw-alias-label-primary,#111);white-space:pre-wrap;word-break:break-word}
.dsh-annotate-note{grid-column:1/-1;display:flex;flex-direction:column;gap:2px}
.dsh-annotate-noteLabel{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#9aa0a6)}
.dsh-annotate-noteText{font-size:14px;line-height:1.65;color:var(--dsw-alias-label-primary,#111);white-space:pre-wrap;word-break:break-word}
.dsh-annotate-noteInput{width:100%;box-sizing:border-box;min-height:56px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:10px;background:transparent;color:inherit;font:inherit;font-size:14px;line-height:1.6;resize:vertical;outline:none}
.dsh-annotate-noteInput:focus{border-color:var(--dsw-alias-state-business-primary,#2f6bff)}
.dsh-annotate-chip{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 6px 0 12px;box-sizing:border-box;corner-shape:round;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.1));border-radius:999px;background:var(--dsw-alias-button-floating-fill,#fff);box-shadow:var(--dsw-elevation-panel,0 2px 8px rgba(0,0,0,.08));color:var(--dsw-alias-label-secondary,#5f6368);font:inherit;font-size:13px;cursor:pointer}
.dsh-annotate-chip:hover{background:var(--dsw-alias-button-floating-hover,rgba(0,0,0,.05))}
.dsh-annotate-chipLabel{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.dsh-annotate-chipClose{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-left:2px;padding:0;border:0;border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary,#9aa0a6);cursor:pointer}
.dsh-annotate-chipClose:hover{background:var(--dsw-alias-label-primary,#111);color:var(--dsw-alias-button-floating-fill,#fff)}

/* 收起草稿里那块引用：核心把引用渲染成 [data-quote-preview]，
   在 composer 里藏掉它，只留我们的面板。 */
html body[data-dsh-annotate-inline] [data-lexical-editor] [data-composer-quote],
html body[data-dsh-annotate-inline] [data-lexical-editor] [data-quote-preview]{display:none!important}
/* 选中高亮：只在批注浮层打开期间生效，避免改动全站选区样式。
   第一版 28% 品牌色淡染在白底上只有 1.34:1，几乎看不见，等于没选。
   这一版把品牌橙压深一档：#bc5734 在页面底上 4.61:1，反白文字同样 4.61:1，
   两端都过 WCAG AA，既和面板同色系，又一眼分得清选到哪。深色主题换用
   更亮的 #e08c6f（压 #191919 有 6.8:1），避免深底上糊成一团。
   特异性用 html body + * 起两级，压过主题里硬编码的选区规则。 */
html body[data-dsh-annotate-active] :is([data-chat-flow],[data-lexical-editor]) :is(p,li,td,th,blockquote,pre,h1,h2,h3,h4,h5,h6)::selection,
html body[data-dsh-annotate-active] :is([data-chat-flow],[data-lexical-editor]) *::selection,
html body[data-dsh-annotate-active] .dsh-annotate-pop::selection,
html body[data-dsh-annotate-active] .dsh-annotate-pop *::selection{background-color:#bc5734!important;color:#ffffff!important}
html body[data-dsh-annotate-active][data-ds-dark-theme] :is([data-chat-flow],[data-lexical-editor]) :is(p,li,td,th,blockquote,pre,h1,h2,h3,h4,h5,h6)::selection,
html body[data-dsh-annotate-active][data-ds-dark-theme] :is([data-chat-flow],[data-lexical-editor]) *::selection,
html body[data-dsh-annotate-active][data-ds-dark-theme] .dsh-annotate-pop::selection,
html body[data-dsh-annotate-active][data-ds-dark-theme] .dsh-annotate-pop *::selection{background-color:#e08c6f!important;color:#161616!important}
@supports (background:color-mix(in srgb,red 0%,transparent)){
html body[data-dsh-annotate-active] :is([data-chat-flow],[data-lexical-editor]) :is(p,li,td,th,blockquote,pre,h1,h2,h3,h4,h5,h6)::selection,
html body[data-dsh-annotate-active] :is([data-chat-flow],[data-lexical-editor]) *::selection,
html body[data-dsh-annotate-active] .dsh-annotate-pop::selection,
html body[data-dsh-annotate-active] .dsh-annotate-pop *::selection{background-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#d97757) 80%,#000000)!important;color:#ffffff!important}
html body[data-dsh-annotate-active][data-ds-dark-theme] :is([data-chat-flow],[data-lexical-editor]) :is(p,li,td,th,blockquote,pre,h1,h2,h3,h4,h5,h6)::selection,
html body[data-dsh-annotate-active][data-ds-dark-theme] :is([data-chat-flow],[data-lexical-editor]) *::selection,
html body[data-dsh-annotate-active][data-ds-dark-theme] .dsh-annotate-pop::selection,
html body[data-dsh-annotate-active][data-ds-dark-theme] .dsh-annotate-pop *::selection{background-color:color-mix(in srgb,var(--dsw-alias-brand-primary,#d97757) 55%,#ffffff)!important;color:#161616!important}
}
`
		const tagId = 'dsh-annotate/annotate.css'
		if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
			const tag = document.createElement('style')
			tag.dataset.plugin = 'dsh-annotate'
			tag.dataset.pluginCss = tagId
			tag.textContent = css
			document.head.appendChild(tag)
		}
		//#endregion

		//#region locale
		const NS = 'dshAnnotate'
		const zh = {
			placeholder: '可选，补充一句批注……',
			submit: '添加到对话',
			blocked: '这一轮还在生成，等它结束再引用',
			selectedText: '选中文本',
			userComment: '批注',
			edit: '编辑批注',
			remove: '删除这条批注',
			save: '保存',
			cancel: '取消',
			annotation: '条批注',
			annotations: '条批注',
			addNote: '添加批注…',
			dismiss: '收起',
		}
		const en = {
			placeholder: 'Add an optional comment...',
			submit: 'Add to conversation',
			blocked: 'This turn is still running — try again when it settles',
			selectedText: 'Selected text',
			userComment: 'User comment',
			edit: 'Edit comment',
			remove: 'Remove this annotation',
			save: 'Save',
			cancel: 'Cancel',
			annotation: 'annotation',
			annotations: 'annotations',
			addNote: 'Add a comment…',
			dismiss: 'Dismiss',
		}
		//#endregion

		//#region quote text (same blockquote contract the composer serialises)
		/** Remove one blockquote marker from each explicitly quoted line. */
		function quoteTextOf(text) {
			return text.replace(/\r\n?/gu, '\n').replace(/^ {0,3}>[ \t]?/gmu, '')
		}

		/** Recognise consecutive explicitly marked Markdown blockquote lines. */
		function messageQuoteRanges(text) {
			const ranges = []
			for (const match of text.matchAll(/^ {0,3}>[^\r\n]*(?:\r?\n {0,3}>[^\r\n]*)*/gmu)) {
				if (quoteTextOf(match[0]).trim() !== '') ranges.push({ start: match.index, end: match.index + match[0].length })
			}
			return ranges
		}

		/**
		 * Present sent blockquotes as one atomic quote node, and the paragraph
		 * separator between two runs as inline space. `dsh-annotate` below is the
		 * node key this rule emits for the quote itself.
		 */
		const quoteRule = {
			id: 'dsh-annotate-quote',
			order: -10,
			match(text, from) {
				for (const range of messageQuoteRanges(text)) {
					for (const start of [range.start - 2, range.start, range.end]) {
						if (start < from) continue
						if (start === range.start) {
							return {
								id: 'dsh-annotate',
								start,
								end: range.end,
								data: { text: quoteTextOf(text.slice(start, range.end)) },
							}
						}
						if (text.slice(start, start + 2) === '\n\n') {
							return {
								id: 'text',
								start,
								end: start + 2,
								data: { text: '\n\n', display: ' ' },
							}
						}
					}
				}
				return undefined
			},
		}
		//#endregion

		//#region components
		const h = react.createElement

		/** Literal display for quote nodes produced by the rule above. */
		function QuotedUserText({ node }) {
			return h(primitives.QuotePreview, { text: node.data.text })
		}

		/**
		 * The selection surface: the picked excerpt, one optional comment, confirm.
		 *
		 * The comment field appears immediately, but nothing takes focus on mount.
		 * Auto-focusing the field would collapse the transcript selection and make
		 * ⌘C copy nothing, so the selection survives until the reader deliberately
		 * clicks into the field. Until then the browser copy gesture still works;
		 * once the field does hold focus and the native selection is gone, a
		 * capturing `copy` listener serves the captured excerpt instead.
		 *
		 * The excerpt is captured once. The host keeps its own clone of the picked
		 * range, so the excerpt stays readable after the call site's handlers run.
		 */
		function AnnotationAction(props) {
			const { dismiss, readText, clearSelection, inputActions } = props
			const t = typeof props.t === 'function' ? props.t : (key) => key
			const [excerpt] = react.useState(() => readText())
			const [comment, setComment] = react.useState('')
			const [notice, setNotice] = react.useState(null)
			const rootRef = react.useRef(null)
			const inputRef = react.useRef(null)

			react.useEffect(() => {
				if (excerpt === null) dismiss()
			}, [dismiss, excerpt])

			// Tint the live transcript selection only while this surface is open, so
			// the highlight matches the panel instead of the theme's blue default.
			react.useEffect(() => {
				if (excerpt === null) return
				const body = document.body
				body.setAttribute('data-dsh-annotate-active', '')
				return () => body.removeAttribute('data-dsh-annotate-active')
			}, [excerpt])

			// Keep ⌘C meaningful after the field takes focus: the native selection
			// collapses when the reader clicks the input, so answer the copy gesture
			// with the captured excerpt instead of an empty clipboard.
			react.useEffect(() => {
				if (excerpt === null) return
				const onCopy = (event) => {
					const root = rootRef.current
					if (root === null || !root.isConnected) return
					const doc = root.ownerDocument
					if (doc === null) return
					const active = doc.activeElement
					if (active === null || !root.contains(active)) return
					const selection = doc.getSelection()
					if (selection !== null && !selection.isCollapsed) return
					const target = event.target
					const fieldSelection =
						target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
							? target.selectionStart !== target.selectionEnd
							: false
					if (fieldSelection) return
					event.clipboardData?.setData('text/plain', excerpt)
					event.preventDefault()
				}
				document.addEventListener('copy', onCopy, true)
				return () => document.removeEventListener('copy', onCopy, true)
			}, [excerpt])

			/**
			 * Confirm the selection.
			 *
			 * The comment written here rides inside the quote node (the only public
			 * carrier to the send path), and the dock above the composer reads it
			 * back out for display and editing. The transcript keeps its selection
			 * until this point so copying first still works.
			 */
			const submit = react.useCallback(() => {
				if (excerpt === null) {
					dismiss()
					return
				}
				// The composer refuses a quote while a turn is running, while the draft
				// is frozen, or while unsent blocks exist. Keep the surface open so the
				// comment the reader typed is not thrown away.
				if (!inputActions.insertQuote(formatAnnotation(excerpt, comment))) {
					setNotice(t('blocked'))
					return
				}
				clearSelection()
				dismiss()
			}, [clearSelection, comment, dismiss, excerpt, inputActions, t])

			const onKeyDown = react.useCallback(
				(event) => {
					if (event.key === 'Enter' && !event.shiftKey) {
						event.preventDefault()
						submit()
						return
					}
					if (event.key === 'Escape') {
						event.preventDefault()
						event.stopPropagation()
						dismiss()
					}
				},
				[dismiss, submit],
			)

			// A press anywhere but the field must not collapse the transcript
			// selection, so the reader can still copy after touching the card.
			const onMouseDown = react.useCallback((event) => {
				if (event.target !== inputRef.current) event.preventDefault()
			}, [])

			if (excerpt === null) return null

			return h(
				'div',
				{ ref: rootRef, className: 'dsh-annotate-pop', role: 'group', 'aria-label': t('submit'), onMouseDown },
				h('div', { className: 'dsh-annotate-excerpt' }, excerpt),
				h(
					'div',
					{ className: 'dsh-annotate-row' },
					h('input', {
						ref: inputRef,
						className: 'dsh-annotate-input',
						type: 'text',
						value: comment,
						placeholder: t('placeholder'),
						'aria-label': t('placeholder'),
						onChange: (event) => setComment(event.target.value),
						onKeyDown,
					}),
					h(
						'button',
						{
							type: 'button',
							className: 'dsh-annotate-ok',
							title: t('submit'),
							'aria-label': t('submit'),
							onMouseDown: (event) => event.preventDefault(),
							onClick: submit,
						},
						h(
							'svg',
							{ viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true },
							h('path', {
								d: 'M3.5 8.5l3 3 6-7',
								fill: 'none',
								stroke: 'currentColor',
								strokeWidth: 1.8,
								strokeLinecap: 'round',
								strokeLinejoin: 'round',
							}),
						),
					),
				),
				notice === null ? null : h('div', { className: 'dsh-annotate-hint dsh-annotate-warn', role: 'status' }, notice),
			)
		}
		/**
		 * One annotation as the panel shows it, parsed back out of the draft quote.
		 *
		 * The quote channel is the only public carrier from a selection to the send
		 * path, so the comment rides inside the quote text after a sentinel line.
		 * This parses that shape back into its two halves for display and editing;
		 * anything without the sentinel is a plain quote and is not ours.
		 */
		const NOTE_SENTINEL = '↳ 批注：'

		function parseAnnotation(quote) {
			const raw = String(quote.text ?? '').replace(/\r\n?/gu, '\n')
			const at = raw.lastIndexOf('\n' + NOTE_SENTINEL)
			if (at >= 0) {
				return { key: quote.key, text: raw.slice(0, at), note: raw.slice(at + 1 + NOTE_SENTINEL.length) }
			}
			if (raw.startsWith(NOTE_SENTINEL)) {
				return { key: quote.key, text: '', note: raw.slice(NOTE_SENTINEL.length) }
			}
			return { key: quote.key, text: raw, note: '' }
		}

		/** Rebuild the quote payload the composer expects from its two halves. */
		function formatAnnotation(text, note) {
			const body = String(text ?? '').replace(/\r\n?/gu, '\n').trimEnd()
			const trimmed = String(note ?? '').replace(/\r\n?/gu, '\n').trim()
			return trimmed === '' ? body : `${body}\n${NOTE_SENTINEL}${trimmed}`
		}

		/**
		 * Read the live quote list off a session's composer shell.
		 *
		 * The dock's published `input` state carries the draft text but not the
		 * quote nodes, so this resolves the session-scope `conversation` service and
		 * reads the shell's `draftSnapshot`, which does expose them with their keys.
		 */
		function readQuotes(shell) {
			const quotes = shell?.draftSnapshot?.quotes
			if (!Array.isArray(quotes)) return []
			return quotes.map(parseAnnotation)
		}

		function CountLabel({ count, t }) {
			const key = count === 1 ? 'annotation' : 'annotations'
			return `${count} ${t(key)}`
		}

		function PencilIcon() {
			return h(
				'svg',
				{ viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
				h('path', { d: 'M11.2 2.6 13.4 4.8 5.6 12.6 2.6 13.4 3.4 10.4z', strokeLinejoin: 'round' }),
			)
		}

		function TrashIcon() {
			return h(
				'svg',
				{ viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
				h('path', { d: 'M2.6 4.3h10.8M6.4 4.3V2.8h3.2v1.5M4.2 4.3l.7 8.4a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.7-8.4', strokeLinecap: 'round', strokeLinejoin: 'round' }),
			)
		}

		function CloseIcon({ size = 14 }) {
			return h(
				'svg',
				{ viewBox: '0 0 16 16', width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true },
				h('path', { d: 'M4 4l8 8M12 4l-8 8', strokeLinecap: 'round' }),
			)
		}

		function NoteIcon() {
			return h(
				'svg',
				{ viewBox: '0 0 16 16', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
				h('path', { d: 'M2.8 3.4h10.4v7.2H7.2L4 13.2v-2.6H2.8z', strokeLinejoin: 'round' }),
			)
		}

		/**
		 * The annotation summary dock: a padded panel listing every annotation on
		 * the current draft, and a compact chip that opens and closes it.
		 *
		 * Quotes live in the composer draft, so this reads them from the session's
		 * input shell rather than keeping a parallel list — edit and remove acts on
		 * the draft itself, and the model always sees what this panel shows.
		 */
		function AnnotationDock(props) {
			const { sessionId, useInput, useSession, inputActions } = props
			const t = typeof props.t === 'function' ? props.t : (key) => key
			const input = useInput((s) => s)
			const session = useSession((s) => s)
			// Collapsed by default: the chip alone carries the count, so the panel only
			// takes vertical space when the reader asks for it.
			const [open, setOpen] = react.useState(false)
			const [editing, setEditing] = react.useState(null)
			const [draftNote, setDraftNote] = react.useState('')
			const [notice, setNotice] = react.useState(null)
			const lastCount = react.useRef(0)

			// `input.draft` changes whenever the draft content changes, so it doubles as
			// the revision this list is derived from. Reading quotes needs the shell.
			const shell = props.getShell?.() ?? null
			const revision = input?.draft ?? null
			const quotes = react.useMemo(() => readQuotes(shell), [revision, shell])

			// Only annotate a live conversation: a removed session or a finished
			// subagent run has no composer to write back into.
			const enabled =
				sessionId !== undefined &&
				session !== undefined &&
				!session.removed &&
				(session.subagent === null ||
					(session.subagent.address.mode === 'continuable' && session.subagent.parentAvailable === true))

			// Hide the draft's own quote chip while annotations are present: the panel
			// already shows the same text, and the duplicate reads as noise above the
			// composer. The node stays in the draft so sending still carries it.
			react.useEffect(() => {
				const body = document.body
				if (quotes.length === 0) {
					body.removeAttribute('data-dsh-annotate-inline')
					return
				}
				body.setAttribute('data-dsh-annotate-inline', '')
				return () => body.removeAttribute('data-dsh-annotate-inline')
			}, [quotes.length])

			react.useEffect(() => {
				if (!enabled) setOpen(false)
			}, [enabled])

			// A newly added annotation opens the panel once, so the reader sees what
			// was captured. Further adds keep the panel in whatever state they left it;
			// collapsing again stays collapsed.
			react.useEffect(() => {
				const count = quotes.length
				const grew = count > lastCount.current
				lastCount.current = count
				if (!grew) return
				setOpen(true)
			}, [quotes.length])

			const startEdit = react.useCallback((item) => {
				setEditing(item.key)
				setDraftNote(item.note)
			}, [])

			/**
			 * Remove one annotation by driving the composer's own quote chip.
			 *
			 * The draft exposes no per-quote mutation API — `setDraft` takes plain
			 * text and would drop every quote. Each quote renders as one
			 * `[data-composer-quote]` host carrying its own remove button, so the
			 * reliable path is to index those hosts in draft order and press the
			 * button on the matching one.
			 */
			const remove = react.useCallback(
				(index) => {
					const editor = document.querySelector('[data-lexical-editor="true"]')
					if (editor === null) {
						setNotice(t('blocked'))
						return
					}
					const hosts = editor.querySelectorAll('[data-composer-quote]')
					const host = hosts[index]
					if (host === undefined) {
						setNotice(t('blocked'))
						return
					}
					const button = host.querySelector('button')
					if (button === null) {
						setNotice(t('blocked'))
						return
					}
					button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
					setNotice(null)
				},
				[t],
			)

			/**
			 * Save an edited comment by replacing the quote chip it belongs to.
			 *
			 * Same constraint as removal: no in-place quote edit exists. Removing the
			 * old chip and inserting the rebuilt payload at the caret is the closest
			 * the public surface allows, and it keeps the node count consistent.
			 */
			const commitEdit = react.useCallback(
				(index, item) => {
					const editor = document.querySelector('[data-lexical-editor="true"]')
					const hosts = editor === null ? [] : editor.querySelectorAll('[data-composer-quote]')
					const host = hosts[index]
					const button = host?.querySelector('button')
					if (button === undefined || button === null) {
						setNotice(t('blocked'))
						return
					}
					button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
					const body = formatAnnotation(item.text, draftNote)
					if (!inputActions.insertQuote(body)) {
						setNotice(t('blocked'))
						return
					}
					setEditing(null)
					setNotice(null)
				},
				[draftNote, inputActions, t],
			)

			if (!enabled || quotes.length === 0) return null

			const chip = h(
				'button',
				{
					type: 'button',
					className: 'dsh-annotate-chip',
					'aria-expanded': open,
					onClick: () => {
						setNotice(null)
						setOpen((value) => !value)
					},
				},
				h('span', { className: 'dsh-annotate-chipLabel' }, h(NoteIcon), h(CountLabel, { count: quotes.length, t })),
				h(
					'span',
					{
						className: 'dsh-annotate-chipClose',
						role: 'button',
						tabIndex: 0,
						title: t('dismiss'),
						'aria-label': t('dismiss'),
						onClick: (event) => {
							event.stopPropagation()
							setOpen(false)
						},
						onKeyDown: (event) => {
							if (event.key !== 'Enter' && event.key !== ' ') return
							event.preventDefault()
							event.stopPropagation()
							setOpen(false)
						},
					},
					h(CloseIcon),
				),
			)

			if (!open) return h('div', { className: 'dsh-annotate-dock' }, chip)

			const rows = quotes.map((item, index) =>
				h(
					'div',
					{ className: 'dsh-annotate-item', key: item.key ?? index },
					h(
						'div',
						{ className: 'dsh-annotate-itemHead' },
						h('span', { className: 'dsh-annotate-itemTitle' }, `${index + 1}. ${t('selectedText')}`),
						h(
							'span',
							{ className: 'dsh-annotate-itemTools' },
							h(
								'button',
								{
									type: 'button',
									className: 'dsh-annotate-tool',
									title: t('edit'),
									'aria-label': t('edit'),
									onClick: () => (editing === item.key ? setEditing(null) : startEdit(item)),
								},
								h(PencilIcon),
							),
							h(
								'button',
								{
									type: 'button',
									className: 'dsh-annotate-tool',
									title: t('remove'),
									'aria-label': t('remove'),
									onClick: () => remove(index),
								},
								h(TrashIcon),
							),
						),
					),
					h('div', { className: 'dsh-annotate-quoteText' }, item.text),
					editing === item.key
						? h(
								'div',
								{ className: 'dsh-annotate-note' },
								h('span', { className: 'dsh-annotate-noteLabel' }, t('userComment')),
								h('textarea', {
									className: 'dsh-annotate-noteInput',
									value: draftNote,
									placeholder: t('addNote'),
									onChange: (event) => setDraftNote(event.target.value),
									onKeyDown: (event) => {
										if (event.key === 'Enter' && !event.shiftKey) {
											event.preventDefault()
											commitEdit(index, item)
										}
										if (event.key === 'Escape') {
											event.preventDefault()
											setEditing(null)
										}
									},
								}),
								h(
									'div',
									{ className: 'dsh-annotate-row' },
									h(
										'button',
										{
											type: 'button',
											className: 'dsh-annotate-ok',
											title: t('save'),
											'aria-label': t('save'),
											onClick: () => commitEdit(index, item),
										},
										h(
											'svg',
											{ viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true },
											h('path', {
												d: 'M3.5 8.5l3 3 6-7',
												fill: 'none',
												stroke: 'currentColor',
												strokeWidth: 1.8,
												strokeLinecap: 'round',
												strokeLinejoin: 'round',
											}),
										),
									),
								),
							)
						: item.note === ''
							? null
							: h(
									'div',
									{ className: 'dsh-annotate-note' },
									h('span', { className: 'dsh-annotate-noteLabel' }, t('userComment')),
									h('div', { className: 'dsh-annotate-noteText' }, item.note),
								),
				),
			)

			return h(
				'div',
				{ className: 'dsh-annotate-dock' },
				h(
					'div',
					{ className: 'dsh-annotate-panel', role: 'group', 'aria-label': t('annotations') },
					rows,
					notice === null ? null : h('div', { className: 'dsh-annotate-hint dsh-annotate-warn', role: 'status' }, notice),
				),
				chip,
			)
		}
		//#endregion
		const name = 'dsh-annotate'
		const inject = ['slots', 'locale', 'uiConversation']

		/**
		 * Register annotation admission, its surface, and quote rendering.
		 * @param ctx - Client root context owning every contribution.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-annotate: dictionaries')

			ctx.effect(() => ctx.uiConversation.userText.register(quoteRule), 'dsh-annotate: user text rule')

			// Claim the selection gesture. The registry keeps the first handler that
			// opens a surface, so this entry replaces the built-in Quote action; the
			// host disables @deepseek-ai/dsh-message-quotes alongside this plugin.
			ctx.effect(
				() =>
					ctx.uiConversation.interactions.register({
						id: 'annotate',
						onInteraction(request) {
							if (request.trigger !== 'selection') return
							if (request.readText() === null) return
							request.open()
						},
					}),
				'dsh-annotate: selection interaction',
			)

			ctx.slots.inject('conversation.chat.text-interaction', () =>
				ctx.slots.register({ name: 'conversation.chat.text-interaction', key: 'annotate', locale: NS }, AnnotationAction),
			)

			// The summary panel and chip sit in the composer dock, directly above the
			// input card, mirroring the reference layout. The dock injects a resolver
			// for the session's input shell, which is where quote nodes are readable.
			ctx.slots.inject('conversation.input.dock', () => {
				return ctx.slots.register(
					{
						name: 'conversation.input.dock',
						id: 'dsh-annotate',
						order: 10,
						locale: NS,
						inject: (sessionId) => {
							if (sessionId === undefined) return { getShell: () => null }
							return {
								getShell: () => {
									try {
										const actx = ctx.sessions.scope(sessionId)
										if (actx === undefined) return null
										const conversation = actx.get('conversation')
										if (conversation === undefined) return null
										return conversation.input.for(actx)
									} catch {
										return null
									}
								},
							}
						},
					},
					AnnotationDock,
				)
			})

			ctx.slots.inject('conversation.user.text.node', () =>
				ctx.slots.register(
					{ name: 'conversation.user.text.node', key: 'dsh-annotate', priority: 100, locale: NS },
					QuotedUserText,
				),
			)
		}
		//#endregion

		exports.apply = apply
		exports.inject = inject
		exports.name = name
		return module.exports
	},
})
