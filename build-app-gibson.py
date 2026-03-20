import os

# build-app-gibson.py
# Generates AppGibson.tsx by injecting Gibson Matrix JSX into the base App.tsx

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppGibson.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppGibson() {\n")
    elif line.strip() == "export default App;":
        pass
    else:
        new_lines.append(line)

# Find the return block to replace the UI
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
    <div className="gib-shell">
      <header className="gib-header">
        <h1>GIBSON_MATRIX</h1>
        <p>TERMINAL_STATUS: ONLINE | DATA_STREAM: TEXAS_LOTTERY_OFFICIAL</p>
      </header>

      <div className="gib-panel">
        <div className="gib-control-group">
          <label>ACCESS_POINT (ZIP_CODE)</label>
          <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
            <input className="gib-input" type="text" value={zipCode} maxLength={5} style={{width: "140px"}}
              onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="77379" />
            <button 
              className={`gib-chip ${localSort ? 'active' : ''}`}
              onClick={() => setLocalSort(v => !v)}>
              {localSort ? '> DETECTED_LOC' : '> GLOBAL_TX'}
            </button>
          </div>
        </div>

        <div className="gib-control-group">
          <label>CREDIT_ALLOCATION (TICKET_PRICE)</label>
          <div className="gib-chips">
            <button className={`gib-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>ALL_UNITS</button>
            {dataset.summary.ticketPrices.map(p => (
              <button key={p} className={`gib-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
            ))}
          </div>
        </div>

        <div className="gib-control-group">
          <label>OBJECTIVE_PARAMETER</label>
          <div className="gib-chips" style={{marginBottom: "16px"}}>
            <button className={`gib-chip ${objectiveMode === 'probability10x' ? 'active' : ''}`} onClick={() => setObjectiveMode('probability10x')}>PROB_10X</button>
            <button className={`gib-chip ${objectiveMode === 'jackpotTop' ? 'active' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>JACKPOT_ONLY</button>
            <button className={`gib-chip ${objectiveMode === 'bestReturn' ? 'active' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>MAX_EV</button>
          </div>
          {objectiveMode === 'probability10x' && (
            <div style={{borderTop: "1px solid var(--gib-green-dim)", paddingTop: "16px", marginTop: "8px"}}>
              <label>WIN_THRESHOLD_MULTIPLIER</label>
              <div className="gib-chips">
                {[2, 3, 5, 10, 20, 50].map(multiplier => (
                  <button 
                    key={multiplier} 
                    className={`gib-chip ${targetPrizeMultiplier === multiplier ? 'active' : ''}`} 
                    onClick={() => setTargetPrizeMultiplier(multiplier)}>
                    {multiplier}X
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bestGame && (
          <div className="gib-alert">
            <p>
              &gt;&gt; OPTIMAL_TARGET_IDENTIFIED: <br/>
              &gt;&gt; {bestGame.gameName.toUpperCase()} <br/>
              &gt;&gt; RATING: {objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}
            </p>
          </div>
        )}
      </div>

      <div className="gib-tabs">
        <button className={workspaceView === 'buy' ? 'active' : ''} onClick={() => setWorkspaceView('buy')}>STRATEGY_ENGINE</button>
        <button className={workspaceView === 'rank' ? 'active' : ''} onClick={() => setWorkspaceView('rank')}>RANKING_TABLE</button>
      </div>

      {workspaceView === 'buy' && (
        <div style={{maxWidth: "800px", margin: "0 auto"}}>
          <div className="gib-panel" style={{marginBottom: "32px", textAlign: "center"}}>
            <label>SPECIFY_TOTAL_BUDGET</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "12px"}}>
              <span style={{fontSize: "2rem", fontWeight: "bold"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="0" className="gib-input" style={{width: "160px", textAlign: "center"}} />
            </div>
          </div>

          {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
            <div key={budget} className={`gib-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'highlight' : ''}`}>
              <div style={{marginBottom: "16px"}}>
                <span className="gib-card-header">&gt; SIMULATION_RESULT: {currency.format(budget)}</span>
              </div>
              <div>
                {plan ? (
                  <>
                    <div className="gib-picks-list">
                      {plan.lines.map((line) => (
                        <div key={line.game.gameNumber} style={{marginBottom: "8px"}}>
                          {line.ticketCount}x {line.game.gameName.toUpperCase()}
                        </div>
                      ))}
                    </div>
                    
                    <div className="gib-metric-row"><span className="gib-metric-label">TOTAL_COST</span><span className="gib-metric-val">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <div className="gib-metric-row"><span className="gib-metric-label">EXPECTED_PAYOUT</span><span className="gib-metric-val good">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                    ) : (
                      <>
                        <div className="gib-metric-row"><span className="gib-metric-label">PRIMARY_HIT_CHANCE</span><span className="gib-metric-val good">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="gib-metric-row"><span className="gib-metric-label">JACKPOT_CHANCE</span><span className="gib-metric-val">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div style={{textAlign: "center", fontStyle: "italic", opacity: 0.5}}>&gt; INSUFFICIENT_FUNDS_FOR_ANALYSIS</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {workspaceView === 'rank' && (
        <div style={{maxWidth: "1000px", margin: "0 auto"}}>
          {rankedGames.slice(0, 50).map((game, i) => {
            const rScore = rankingScoreForGame(game);
            const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
            
            return (
              <div key={game.gameNumber} className="gib-rank-item">
                <div className="gib-rank-number">{String(i + 1).padStart(2, '0')}</div>
                <div style={{flex: 1}}>
                  <div className="gib-rank-title">{game.gameName.toUpperCase()}</div>
                  <div style={{fontSize: "0.8rem", opacity: 0.6}}>MAX: {formatDollars(game.topPrizeAmount)} | UNIT_COST: {currency.format(game.ticketPrice)}</div>
                </div>
                <div className="gib-rank-score">{scoreStr}</div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  );
}
"""

with open("src/AppGibson.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppGibson.tsx successfully.")
