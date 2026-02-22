import os

with open("src/App.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == "import './App.css';":
        new_lines.append("import './AppLux.css';\n")
    elif line.strip() == "function App() {":
        new_lines.append("export default function AppLux() {\n")
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
    <div className="lux-shell">
      <header className="lux-header">
        <span className="lux-eyebrow">The Editorial Edit</span>
        <h1>Texas Lottery <i>Intelligence</i></h1>
        <p>Curated insights and statistical advantages for the discerning player. Grounded in mathematical reality.</p>
        
        <div className="lux-stats-row">
          <div className="lux-stat">
            <span className="label">Monitored Inventory</span>
            <span className="val">{number.format(dataset.summary.totalGames)}</span>
          </div>
          <div className="lux-stat">
            <span className="label">Unclaimed Premiums</span>
            <span className="val">{number.format(totalRemainingTopPrizes)}</span>
          </div>
          <div className="lux-stat">
            <span className="label">Analysis Vintage</span>
            <span className="val" style={{fontSize: "1.8rem"}}>{formatDate(dataset.source.csvAsOfDate)}</span>
          </div>
        </div>
      </header>

      <section className="lux-controls">
        <div className="lux-controls-grid">
          <div className="lux-control-group">
            <label>Search Collection</label>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Enter designation..." />
          </div>
          
          <div className="lux-control-group">
            <label>Local Influence (ZIP)</label>
            <div style={{display: "flex", gap: "16px", alignItems: "center"}}>
              <input type="text" value={zipCode} maxLength={5} style={{width: "100px", textAlign: "center"}}
                onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))} />
              <button 
                className={`lux-chip ${localSort ? 'active' : ''}`}
                onClick={() => setLocalSort(v => !v)}>Retailer Bias: {localSort ? 'Enabled' : 'Disabled'}</button>
            </div>
          </div>
        </div>

        <div className="lux-controls-grid" style={{marginTop: "40px"}}>
          <div className="lux-control-group">
            <label>Denomination</label>
            <div className="lux-chips">
              <button className={`lux-chip ${selectedPrice === 'all' ? 'active' : ''}`} onClick={() => setSelectedPrice('all')}>All Tiers</button>
              {dataset.summary.ticketPrices.map(p => (
                <button key={p} className={`lux-chip ${selectedPrice === p ? 'active' : ''}`} onClick={() => setSelectedPrice(p)}>${p}</button>
              ))}
            </div>
          </div>

          <div className="lux-control-group">
            <label>Strategic Objective</label>
            <div className="lux-chips">
              <button className={`lux-chip ${objectiveMode === 'probability10x' ? 'active-accent' : ''}`} onClick={() => setObjectiveMode('probability10x')}>Targeted Return</button>
              <button className={`lux-chip ${objectiveMode === 'jackpotTop' ? 'active-accent' : ''}`} onClick={() => setObjectiveMode('jackpotTop')}>Maximum Yield</button>
              <button className={`lux-chip ${objectiveMode === 'bestReturn' ? 'active-accent' : ''}`} onClick={() => setObjectiveMode('bestReturn')}>Optimal EV</button>
            </div>
            {objectiveMode === 'probability10x' && (
              <div style={{marginTop: "12px"}}>
                <label>Minimum Return Multiple</label>
                <div className="lux-chips">
                  {[2, 3, 5, 10, 20, 50].map(multiplier => (
                    <button 
                      key={multiplier} 
                      className={`lux-chip ${targetPrizeMultiplier === multiplier ? 'active-accent' : ''}`} 
                      onClick={() => setTargetPrizeMultiplier(multiplier)}>
                      {multiplier}x Cost
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {bestGame && (
          <div className="lux-best-banner">
            <p>
              The premier selection is currently <strong>{bestGame.gameName}</strong>.<br/>
              Its refined appraisal sits at <strong>{objectiveMode === 'bestReturn' ? `${formatPerDollar(rankingReturnForGame(bestGame))} EV` : formatOdds(rankingOddsForGame(bestGame))}</strong>.
            </p>
          </div>
        )}
      </section>

      <div className="lux-tabs">
        <button className={`lux-tab ${workspaceView === 'buy' ? 'active' : ''}`} onClick={() => setWorkspaceView('buy')}>Curated Portfolios</button>
        <button className={`lux-tab ${workspaceView === 'rank' ? 'active' : ''}`} onClick={() => setWorkspaceView('rank')}>The Archives</button>
      </div>

      {workspaceView === 'buy' && (
        <section>
          <h2 style={{textAlign: "center"}}>Suggested Allocations</h2>
          
          <div style={{maxWidth: "400px", margin: "0 auto 40px auto", textAlign: "center", padding: "20px", border: "1px solid var(--lux-border)", borderRadius: "8px"}}>
            <label style={{display: "block", marginBottom: "12px", fontFamily: "var(--lux-font-display)", fontSize: "1.2rem"}}>Assess Bespoke Capital</label>
            <div style={{display: "flex", justifyContent: "center", alignItems: "center", gap: "8px"}}>
              <span style={{fontSize: "1.2rem"}}>$</span>
              <input type="text" value={customBudgetInput} onChange={e => {
                const next = e.target.value.replace(/\D/g, '').slice(0, 3);
                setCustomBudgetInput(next);
                if (!next) return;
                const parsed = Number.parseInt(next, 10);
                if (Number.isFinite(parsed) && parsed > 0) setEvPreviewBudget(Math.min(parsed, 500));
              }} placeholder="$0" className="lux-input" style={{width: "100px", textAlign: "center", fontSize: "1.2rem", borderTop: "none", borderLeft: "none", borderRight: "none", borderRadius: "0", background: "transparent"}} />
            </div>
            {customBudgetValue && <p style={{fontSize: "0.85rem", color: "var(--lux-text-muted)", marginTop: "12px", marginBottom: "0"}}>Appraisal added to portfolios below.</p>}
          </div>

          <div className="lux-card-grid">
            {displayedBudgetPlans.map(({budget, finalPlan: plan}) => (
              <div key={budget} className={`lux-card ${plan && budget >= (bestGame?.ticketPrice ?? 9999) ? 'premium' : ''}`}>
                <h3>Allocation: {currency.format(budget)}</h3>
                {plan ? (
                  <>
                    <p style={{fontFamily: "var(--lux-font-display)", fontSize: "1.4rem", color: "var(--lux-text-primary)", marginBottom: "30px"}}>
                      {plan.lines.map((line) => `${line.ticketCount} \u00d7 ${line.game.gameName}`).join(', ')}
                    </p>
                    
                    <div className="lux-card-row"><span className="k">Capital Spent</span><span className="v">{currency.format(plan.spent)}</span></div>
                    {plan.recommendationTarget === 'expectedValue' ? (
                      <>
                        <div className="lux-card-row"><span className="k">Estimated Yield</span><span className="v highlight">{formatDollars(plan.estimatedExpectedPayout)}</span></div>
                        <div className="lux-card-row"><span className="k">Net Projection</span><span className="v">{formatDollars(plan.estimatedExpectedNet)}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="lux-card-row"><span className="k">Favorable Probability</span><span className="v highlight">{percentage.format(plan.estimatedPrimaryChance)}</span></div>
                        <div className="lux-card-row"><span className="k">Premium Probability</span><span className="v">{percentage.format(plan.estimatedTopPrizeChance)}</span></div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="lux-card-row" style={{border: "none"}}><span className="k">Status</span><span className="v">Insufficient Capital</span></div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {workspaceView === 'rank' && (
        <section>
          <h2>The Database</h2>
          <div className="lux-table-wrapper">
            <table className="lux-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Designation</th>
                  <th>Denomination</th>
                  <th>Premium Yield</th>
                  <th>Inventory</th>
                  <th>Appraisal Score</th>
                </tr>
              </thead>
              <tbody>
                {rankedGames.map((game, i) => {
                  const rScore = rankingScoreForGame(game);
                  const baseMetric = objectiveMode === 'bestReturn' ? formatPerDollar(game.conservativeReturnPerDollar) : formatOdds(game.objectiveBaseOddsOneIn);
                  const scoreStr = objectiveMode === 'bestReturn' ? (rScore ? formatPerDollar(rScore) : 'N/A') : (rScore ? formatOdds(probabilityToOdds(rScore)) : 'N/A');
                  
                  return (
                    <tr key={game.gameNumber}>
                      <td><span className="lux-eyebrow" style={{margin: 0, fontSize: "0.9rem"}}>{String(i + 1).padStart(2, '0')}</span></td>
                      <td>
                        <span className="lux-game-title">{game.gameName}</span>
                        <span className="lux-game-id">REF: {game.gameNumber}</span>
                      </td>
                      <td>{currency.format(game.ticketPrice)}</td>
                      <td>{formatDollars(game.topPrizeAmount)}</td>
                      <td><span className="lux-badge">{number.format(game.topPrizesRemaining)} Left</span></td>
                      <td className="lux-metric-highlight">{scoreStr}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
"""

with open("src/AppLux.tsx", "w") as f:
    f.writelines(header_part)
    f.write(custom_jsx)

print("Generated src/AppLux.tsx successfully.")
