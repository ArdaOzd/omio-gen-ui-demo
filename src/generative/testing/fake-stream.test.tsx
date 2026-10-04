import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useState } from 'react';
function Sequence({ parts }: { parts: Array<{kind:'text';text:string}|{kind:'tool';title:string;complete:boolean}> }) {
  const [selected, setSelected] = useState(false);
  return <section>{parts.map((part,index) => part.kind === 'text' ? <p key={index}>{part.text}</p> : part.complete ? <button key={index} aria-pressed={selected} onClick={() => setSelected(!selected)}>{part.title}</button> : <span key={index} role="status">Preparing view</span>)}</section>;
}
describe('ordered stream foundation', () => {
  it('keeps partial tool controls unmounted between text parts', () => {
    const view=render(<Sequence parts={[{kind:'text',text:'First'},{kind:'tool',title:'Select fare',complete:false}]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Preparing');
    view.rerender(<Sequence parts={[{kind:'text',text:'First'},{kind:'tool',title:'Select fare',complete:true},{kind:'text',text:'After'}]} />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Select fare');
    expect(screen.getByText('First').compareDocumentPosition(screen.getByText('After')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
