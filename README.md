# Blink style experiments

This repository contains a few experiments which look at the performance of Blink's style (CSS) engine.

For more info, see Chris Wong's intern tech talk (Google internal only): <https://go/bse-talk>


## Setting up

1. [Check out and build Chromium.](https://www.chromium.org/developers/how-tos/get-the-code)

2. [Install Node.js.](https://nodejs.org/en/)

3. Install R:

    + On Goobuntu, `sudo apt-get install r-google`.

    + Otherwise, install from the [R project site](https://www.r-project.org/).

4. [Install Pandoc.](https://github.com/jgm/pandoc/releases/latest)

    + This is used to generate HTML reports.

5. Install R dependencies:

    + `R -e install.packages("rmarkdown", "ggplot2", "nnls")`

6. Install Node.js dependencies:

    + `npm install`

    + `node -e 'require("erlenmeyer")' && echo OK`



## Running the experiments

Currently, there are three experiments to play with; they are named **fuzz1**, **fuzz2**, and **fuzz3**.

To start one of these experiments, `cd` into the appropriate directory and run `./collect.sh`. This command will open multiple Chromium windows as the experiment runs. Data will be stored in the `traces/` directory.

Then run `./process.sh` to mush these traces into CSV files.


### Optional: Using Xephyr

[Xephyr](http://www.freedesktop.org/wiki/Software/Xephyr/) is an X11 server that runs in its own window. It can isolate the Chromium instances used in the experiment, so you can continue with other work while the tests run.

To use Xephyr, run the following commands:

```sh
Xephyr -screen 1024x768 :1 &
export DISPLAY=:1
./collect.sh
```

Note that since Xephyr renders in software, graphics-intensive experiments may run slower than usual. Be sure to take this into account when interpreting the results.


## Compiling the report

Run `R -e 'rmarkdown::render("report.Rmd")'` to compile the report. This requires the output CSV files from each experiment, so be sure to run them first!

If it works, you should end up with two files: `report.md` and `report.html`. The HTML file can be viewed in your favorite browser.


## Implementation details

The new HTML and CSS generators, used by `fuzz2` and `fuzz3`, live in `generator2.js`.

The HTML generator works by recursively building a tree of nodes. The branching factor and tree depth are set by the parameters to the generator.

What tags it uses, and where it uses them, is set by the `tagMap` option. When set to `alexa` (the default), it uses data from the Top 500 Alexa sites. This data can be found in `alexa-data.json`; the relevant code can be found at <https://github.com/lfairy/alexa-stats>. By using this data, we automatically build HTML that mirrors the structure of real world pages.

One weakness is that the branching factor remains fixed as the generator goes down the tree. This means that increasing the tree depth, while keeping branching factor constant, will cause an exponential blowup in the number of nodes. Both `fuzz2` and `fuzz3` mitigate this by dropping parameters which make the tree too large, but this rejection sampling can be inefficient if the parameters are near the limit.

Another issue is that the generated elements do not have classes. While it is easy to add IDs -- simply assign a unique ID to every element -- it is unclear how classes fit into this picture. Given that IDs and classes have similar performance characteristics, it was decided to skip classes altogether.

The CSS generator builds multiple rules with different types of selectors. Since the focus is on selector matching, the body of each rule is set to `opacity: 0.99`. This choice of property minimizes the effect of layout.
