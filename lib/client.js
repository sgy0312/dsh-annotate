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
		}
		const en = {
			placeholder: 'Add an optional comment...',
			submit: 'Add to conversation',
			blocked: 'This turn is still running — try again when it settles',
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

			const submit = react.useCallback(() => {
				if (excerpt === null) {
					dismiss()
					return
				}
				const note = comment.trim()
				const payload = note === '' ? excerpt : `${excerpt}\n↳ 批注：${note}`
				// The composer refuses a quote while a turn is running, while the draft
				// is frozen, or while unsent blocks exist. Keep the surface open so the
				// comment the reader typed is not thrown away.
				if (!inputActions.insertQuote(payload)) {
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
		//#endregion

		//#region plugin
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
