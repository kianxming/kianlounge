from pathlib import Path

css_path = Path('v2.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Mobile utility controls: keep save/load and turn state reachable without widening the viewport. */'
if marker not in css:
    css += '''
/* Mobile utility controls: keep save/load and turn state reachable without widening the viewport. */
@media(max-width:760px){
  .topbar{grid-template-columns:auto auto minmax(0,1fr);gap:5px;padding:5px 6px}
  .brand{min-width:0}
  .brand-title{font-size:15px;letter-spacing:-.6px}
  .brand-sub,.resources{display:none}
  .turnbox{display:block;min-width:0;padding:4px 6px;border:1px solid #40331f;border-radius:6px;background:#0c1216}
  .turnbox>div:first-child{display:block}
  .turn-main{font-size:10px;line-height:1.1;white-space:nowrap}
  .turn-sub,.turnbox>.phase-strip{display:none}
  .top-actions{display:flex;max-width:none;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;overscroll-behavior-x:contain}
  .top-actions::-webkit-scrollbar{display:none}
  .top-actions .mini-btn{flex:0 0 auto;padding:6px 7px}
  .top-actions .mini-btn:nth-child(n+5){display:inline-flex}
}
'''
    css_path.write_text(css, encoding='utf-8')
