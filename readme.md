to setup :

install pipenv:

```
pip install pipenv
```


then launch the vertual environment by running

```
python -m pipenv shell
```

then you will be in the virtual environment
then 

do the following again to install pipenv in the virtual environment

```
pip install pipenv
```

then you can do the `pipenv install` to install all the dependencied for this project


next time you want to launch the virtual env - just use the following command



```
python -m pipenv shell
```

if you want to install a new dependecy 

just replace pip with pipenv


example 
```
pipenv install  django 
```

this will make/update the pipfile  and piplock file 



I have done the 
```
pipenv install django==3.1.1 channels==2.4.0  Channels-redis==2.4.2
```
command




requirements

django==3.1.1 channels==2.4.0  Channels-redis==2.4.2
 
 
 
for heroku also need to `pipenv install gunicorn`