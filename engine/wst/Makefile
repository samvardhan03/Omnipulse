.PHONY: build test memcheck clean

build:
	pip install -e ".[dev]" --no-build-isolation

test:
	pytest tests/ -v --tb=short

memcheck:
	compute-sanitizer --tool memcheck python -c "import omni_wst_core; print(omni_wst_core.cuda_available())"

clean:
	rm -rf build/ dist/ *.egg-info _skbuild/
