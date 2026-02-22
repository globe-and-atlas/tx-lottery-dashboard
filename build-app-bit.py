import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppBit.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppBit() {\n")
    elif line.strip() == "export default App;":
        pass
    else:
        new_lines.append(line)

return_start = -1
for i, line in enumerate(new_lines):
    if "return (" in line and i + 1 < len(new_lines) and "className=\"app-shell\"" in new_lines[i+1]:
        return_start = i
        break

if return_start == -1:
    print("Could not find start of return block!")
    exit(1)

header_part = new_lines[:return_start]

custom_jsx = """  return (
    <div className="bit-shell">
      <header className="bit-header">
        <h1>SCRATCH QUEST</h1>
        <p>PRESS START TO WIN <span className="bit-blink">_</span></p>
      </header>

      <div className="bit-panel">
        <div className="bit-panel-title">OPTIONS</div>
        
        <div className="bit-control-group">
          <label>&gt; ENTER ZONE (ZIP CODE)</label>
          <div style={{display: "flex", gap: "16px", alignItems: "center"}}>
            <input className="bit-input" type="text" value={zipCode} maxLength={5} style={{width: "140px", textAlign: "center"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="00000" />
            <button 
              className={`bit-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? '[ LOCAL ]' : '[ WORLD ]'}
            </button>
          </div>
        </div>

        <div className="bit-control-group">
          <label>&gt; SELECT GOLD SPENT (TICKET PRICE)</label>
          <div className="bit-chips">
            <button className={`bit-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ALL</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`bit-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>G{p}</button>
            ))}
          </div>
        </div>

        <div className="bit-control-group">
          <label>&gt; CHOOSE CAMPAIGN MODE</label>
          <div className="bit-chips" style={{marginBottom: "24px"}}>
            <button className={`bit-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>LOOT DROP</button>
            <button className={`bit-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>BOSS FIGHT(JKPT)</button>
            <button className={`bit-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>EXP GRIND(EV)</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{border: "4px dashed var(--bit-accent-cyan)", padding: "16px", marginTop: "16px"}}>
              <label style={{color: "var(--bit-accent-cyan)"}}>&gt; TARGET MULTIPLIER</label>
              <div className="bit-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`bit-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}X
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="bit-alert">
            <div className="bit-alert-title">*** ITEM DISCOVERED ***</div>
            <div className="bit-alert-text">
              EQUIP: <span className="bit-highlight-text">{bestGame.gameName}</span><br/><br/>
              STATS: {objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}
            </div>
          </div>
        )}
      </div>

      <div className="bit-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>INVENTORY (BUDGET)</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>HIGH SCORES (ALL)</button>
      </div>

      {workspaceView === 'buy' && (
        <div>
          <div className="bit-panel" style={{marginBottom: "32px", textAlign: "center"}}>
            <label style={{display: "block", marginBottom: "16px", color: "var(--bit-accent-yellow)"}}>INSERT COIN (CUSTOM BUDGET)</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "16px"}}>
              <span style={{fontSize: "2em", color: "var(--bit-accent-green)"}}>G</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="bit-input" style={{width: "120px", textAlign: "center", fontSize: "1.5em"}} />
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`bit-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div className="bit-card-header">MAX GOLD: {budget}</div>
              <div>
                {plan ? (
                  <>
                    <div className="bit-picks-list">
                      {plan.lines.map((line) => `${line.ticketCount}x ${line.game.gameName}`).join(' + ')}
                    </div>
                    
                    <div className="bit-metric-row"><span className="bit-metric-label">GOLD SPENT</span><span className="bit-metric-val">{plan.spent}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="bit-metric-row"><span className="bit-metric-label">EST VALUE</span><span className="bit-metric-val good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="bit-metric-row"><span className="bit-metric-label">WIN PROB</span><span className="bit-metric-val good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="bit-metric-row"><span className="bit-metric-label">BOSS PROB</span><span className="bit-metric-val">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", color: "var(--bit-accent-red)"}}>NOT ENOUGH GOLD TO EQUIP</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div className="bit-rank-list">
          {rankedGames.slice(0, 50).map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="bit-rank-item">
                <div className="bit-rank-number">
                  {i === 0 ? '1P' : i === 1 ? '2P' : i === 2 ? '3P' : `${i+1}.`}
                </div>
                <div style={{flex: 1}}>
                  <div className="bit-rank-title">{game.gameName}</div>
                  <div className="bit-rank-meta">PRIZE: {formatDollars(game.topPrizeAmount)} | GOLD: {game.ticketPrice}</div>
                </div>
                <div className="bit-rank-score">{scoreStr}</div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  );
}
"""

with open("src/AppBit.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppBit.tsx successfully.")
