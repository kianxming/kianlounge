from pathlib import Path

css_path = Path('v2.css')
css = css_path.read_text(encoding='utf-8')
marker = '/* Mobile utility controls: keep save/load reachable without widening the viewport. */'
if marker not in css:
    css += '''
/* Mobile utility controls: keep save/load reachable without widening the viewport. */
@media(max-width:760px){
  .top-actions{display:flex;max-width:min(58vw,230px);min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;overscroll-behavior-x:contain}
  .top-actions::-webkit-scrollbar{display:none}
  .top-actions .mini-btn{flex:0 0 auto;padding:6px 7px}
  .top-actions .mini-btn:nth-child(n+5){display:inline-flex}
}
'''
    css_path.write_text(css, encoding='utf-8')
