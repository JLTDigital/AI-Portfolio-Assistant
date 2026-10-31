const SIGNAL_BARS = ['h-2', 'h-4', 'h-6', 'h-8']

export function IncomingCall({ onAccept }: { onAccept: () => void }) {
  return (
    <main className='fixed inset-x-4 top-1/2 mx-auto max-h-[calc(100dvh-2rem)] max-w-sm -translate-y-1/2 overflow-y-auto animate-card-in motion-reduce:animate-none sm:top-6 sm:right-6 sm:left-auto sm:mx-0 sm:w-full sm:translate-y-0'>
      <div className='cut-lg bg-frame p-px'>
        <div className='cut-lg flex flex-col gap-4 bg-linear-to-br from-panel-from to-panel-to p-5 pb-8'>
          <p aria-hidden='true' className='text-xs text-alert'>
            LLM NETWORK
          </p>

          <div className='flex items-center gap-4'>
            <div aria-hidden='true' className='relative size-14 shrink-0'>
              <div className='absolute inset-0 animate-call-ring rounded-full border-2 border-accent motion-reduce:animate-none' />
              <div className='absolute inset-4 rounded-full bg-accent shadow-[0_0_12px_var(--glow)]' />
            </div>

            <div className='min-w-0 flex-1'>
              <h1 className='text-sm font-semibold text-muted'>
                INCOMING HOLO CALL
              </h1>
              <p className='text-3xl font-semibold text-accent'>AGENT</p>
            </div>

            <div aria-hidden='true' className='flex items-end gap-1'>
              {SIGNAL_BARS.map((height) => (
                <div key={height} className={`w-1.5 bg-accent ${height}`} />
              ))}
            </div>
          </div>

          <button
            type='button'
            onClick={onAccept}
            className='min-h-12 border border-amber px-4 text-xl font-semibold text-amber hover:bg-amber hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'>
            ACCEPT
          </button>
        </div>
      </div>
    </main>
  )
}
